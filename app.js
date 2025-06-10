// Configuration
const MAPTILER_KEY = 'FelxstvCdS6k0g9YnLdK';
const MAP_STYLE = `https://api.maptiler.com/maps/0196a72c-f543-7d0f-a1dd-d13762e765b7/style.json?key=${MAPTILER_KEY}`;

// App state
let state = {
    map: null,
    selectedCountries: [],
    highlightEnabled: false,
    countriesGeoJson: null,
    currentView: 'home',
    currentCountry: null
};

// DOM Elements
const appEl = document.getElementById('app');

// Initialize the app
async function initApp() {
    await loadCountriesGeoJson();
    renderHomePage();
}

// Load countries GeoJSON data
async function loadCountriesGeoJson() {
    try {
        const response = await fetch('countries.geojson');
        state.countriesGeoJson = await response.json();
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
    }
}

// Search functions
async function searchLocations(query) {
    if (!query) return [];
    
    // First try local search
    const localResults = searchInLocalGeoJson(query);
    if (localResults.length > 0) return localResults;
    
    // Fall back to API search
    return await searchViaApi(query);
}

function searchInLocalGeoJson(query) {
    if (!state.countriesGeoJson) return [];
    
    const lowerQuery = query.toLowerCase();
    return state.countriesGeoJson.features.filter(feature => {
        const name = feature.properties.name?.toString().toLowerCase() || '';
        const code = feature.properties['ISO3166-1-Alpha-2']?.toString().toLowerCase() || '';
        return name.includes(lowerQuery) || code.includes(lowerQuery);
    }).map(feature => ({
        id: feature.properties['ISO3166-1-Alpha-2'],
        place_name: feature.properties.name,
        geometry: feature.geometry,
        properties: feature.properties
    }));
}

async function searchViaApi(query) {
    try {
        const response = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&types=country&limit=5`);
        const data = await response.json();
        return data.features.map(feature => {
            feature.id = feature.properties?.country_code || feature.properties?.['iso_3166_1_alpha2'];
            return feature;
        });
    } catch (error) {
        console.error('API search error:', error);
        return [];
    }
}

// Map functions
function initializeMap(containerId) {
    state.map = new maplibregl.Map({
        container: containerId,
        style: MAP_STYLE,
        center: [0, 0],
        zoom: 1
    });
    
    state.map.on('load', () => {
        if (state.highlightEnabled && state.selectedCountries.length > 0) {
            updateHighlightedCountries();
        }
    });
}

function moveCameraToLocation(feature) {
    if (!state.map) return;
    
    const geometry = feature.geometry;
    if (!geometry) return;
    
    let coordinates;
    if (geometry.type === 'Point') {
        coordinates = geometry.coordinates;
    } else {
        // For polygons, use the first coordinate of the first polygon
        coordinates = geometry.coordinates[0][0];
    }
    
    state.map.flyTo({
        center: [coordinates[0], coordinates[1]],
        zoom: 4
    });
}

async function updateHighlightedCountries() {
    if (!state.map || !state.highlightEnabled || !state.countriesGeoJson) return;
    
    try {
        // Remove existing layers if they exist
        if (state.map.getLayer('countries-highlight-layer')) {
            state.map.removeLayer('countries-highlight-layer');
        }
        if (state.map.getSource('countries-highlight-source')) {
            state.map.removeSource('countries-highlight-source');
        }
        
        if (state.selectedCountries.length === 0) return;
        
        const selectedFeatures = state.countriesGeoJson.features.filter(feature => {
            const countryCode = feature.properties['ISO3166-1-Alpha-2'];
            return state.selectedCountries.some(c => c.id?.toLowerCase() === countryCode?.toLowerCase());
        });
        
        if (selectedFeatures.length === 0) return;
        
        const featureCollection = {
            type: 'FeatureCollection',
            features: selectedFeatures
        };
        
        state.map.addSource('countries-highlight-source', {
            type: 'geojson',
            data: featureCollection
        });
        
        state.map.addLayer({
            id: 'countries-highlight-layer',
            type: 'fill',
            source: 'countries-highlight-source',
            paint: {
                'fill-color': '#ff69b4',
                'fill-opacity': 1,
                'fill-outline-color': '#ff1493'
            }
        });
    } catch (error) {
        console.error('Error highlighting countries:', error);
    }
}

function toggleHighlightEnabled() {
    state.highlightEnabled = !state.highlightEnabled;
    updateHighlightedCountries();
    renderHomePage(); // Re-render to update the UI
}

function toggleCountryHighlight(country) {
    const index = state.selectedCountries.findIndex(c => c.id === country.id);
    if (index >= 0) {
        state.selectedCountries.splice(index, 1);
    } else {
        state.selectedCountries.push(country);
    }
    
    if (state.highlightEnabled) {
        updateHighlightedCountries();
    }
    
    renderHomePage(); // Re-render to update the UI
}

// Navigation functions
function navigateTo(view, country = null) {
    state.currentView = view;
    state.currentCountry = country;
    
    if (view === 'home') {
        renderHomePage();
    } else if (view === 'country') {
        renderCountryPage();
    }
}

// Rendering functions
function renderHomePage() {
    appEl.innerHTML = `
        <div class="flex flex-col h-full">
            <header class="bg-blue-600 text-white p-4 shadow-md">
                <h1 class="text-xl font-bold">Trip Journal</h1>
            </header>
            
            <div class="flex flex-col flex-1 overflow-hidden">
                <!-- Search and controls -->
                <div class="p-4 bg-white shadow-sm">
                    <div class="flex items-center gap-2">
                        <div class="relative flex-1">
                            <input 
                                id="searchInput" 
                                type="text" 
                                placeholder="Search for countries..." 
                                class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <div id="searchResults" class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg hidden"></div>
                        </div>
                        <button 
                            id="toggleHighlight" 
                            class="p-3 rounded-lg ${state.highlightEnabled ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'}"
                        >
                            <i class="fas fa-highlighter"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Map -->
                <div id="mapContainer" class="h-96 w-full"></div>
                
                <!-- Selected countries list -->
                <div class="flex-1 overflow-y-auto">
                    <div class="p-4">
                        <h2 class="text-lg font-semibold mb-2">Selected Countries</h2>
                        <ul id="selectedCountriesList" class="divide-y divide-gray-200">
                            ${state.selectedCountries.length > 0 
                                ? state.selectedCountries.map(country => `
                                    <li class="py-3 flex justify-between items-center">
                                        <a 
                                            href="#" 
                                            class="text-blue-600 underline hover:text-blue-800 country-link" 
                                            data-id="${country.id}"
                                        >
                                            ${country.place_name || 'Unknown Country'}
                                        </a>
                                        <button 
                                            class="text-red-500 hover:text-red-700 delete-btn" 
                                            data-id="${country.id}"
                                        >
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </li>
                                `).join('')
                                : '<li class="py-3 text-gray-500">No countries selected</li>'
                            }
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Bottom navigation -->
            <nav class="bg-white border-t border-gray-200 flex justify-around py-3">
                <button class="text-blue-600 flex flex-col items-center">
                    <i class="fas fa-home"></i>
                    <span class="text-xs mt-1">Home</span>
                </button>
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-photo-video"></i>
                    <span class="text-xs mt-1">Gallery</span>
                </button>
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-user"></i>
                    <span class="text-xs mt-1">Profile</span>
                </button>
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-cog"></i>
                    <span class="text-xs mt-1">Settings</span>
                </button>
            </nav>
        </div>
    `;
    
    // Initialize the map
    if (!state.map) {
        initializeMap('mapContainer');
    } else {
        document.getElementById('mapContainer').appendChild(state.map.getContainer());
    }
    
    // Set up event listeners
    setupSearch();
    document.getElementById('toggleHighlight').addEventListener('click', toggleHighlightEnabled);
    
    // Country link click handlers
    document.querySelectorAll('.country-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const countryId = link.getAttribute('data-id');
            const country = state.selectedCountries.find(c => c.id === countryId);
            if (country) {
                moveCameraToLocation(country);
                navigateTo('country', country);
            }
        });
    });
    
    // Delete button handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const countryId = btn.getAttribute('data-id');
            const country = state.selectedCountries.find(c => c.id === countryId);
            if (country) {
                toggleCountryHighlight(country);
            }
        });
    });
}

function renderCountryPage() {
    if (!state.currentCountry) {
        navigateTo('home');
        return;
    }
    
    const country = state.currentCountry;
    appEl.innerHTML = `
        <div class="flex flex-col h-full">
            <header class="bg-blue-600 text-white p-4 shadow-md flex items-center">
                <button id="backButton" class="mr-2">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h1 class="text-xl font-bold">${country.place_name || 'Country Details'}</h1>
            </header>
            
            <div class="flex-1 overflow-y-auto p-4">
                <h2 class="text-lg font-semibold mb-4">${country.place_name || 'Country'} Details</h2>
                <div class="bg-white rounded-lg shadow p-4 mb-4">
                    <h3 class="font-medium text-gray-700 mb-2">Information</h3>
                    <p>Country code: ${country.id}</p>
                    <!-- Add more country details here as needed -->
                </div>
                
                <!-- Add more country-specific content here -->
            </div>
            
            <!-- Bottom navigation -->
            <nav class="bg-white border-t border-gray-200 flex justify-around py-3">
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-home"></i>
                    <span class="text-xs mt-1">Home</span>
                </button>
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-photo-video"></i>
                    <span class="text-xs mt-1">Gallery</span>
                </button>
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-user"></i>
                    <span class="text-xs mt-1">Profile</span>
                </button>
                <button class="text-gray-600 flex flex-col items-center">
                    <i class="fas fa-cog"></i>
                    <span class="text-xs mt-1">Settings</span>
                </button>
            </nav>
        </div>
    `;
    
    // Back button handler
    document.getElementById('backButton').addEventListener('click', () => {
        navigateTo('home');
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', async () => {
        clearTimeout(searchTimeout);
        
        const query = searchInput.value.trim();
        if (!query) {
            searchResults.innerHTML = '';
            searchResults.classList.add('hidden');
            return;
        }
        
        // Show loading state
        searchResults.innerHTML = '<div class="p-3 text-gray-500">Searching...</div>';
        searchResults.classList.remove('hidden');
        
        searchTimeout = setTimeout(async () => {
            const results = await searchLocations(query);
            
            if (results.length === 0) {
                searchResults.innerHTML = '<div class="p-3 text-gray-500">No countries found</div>';
                return;
            }
            
            searchResults.innerHTML = results.map(country => {
                const isSelected = state.selectedCountries.some(c => c.id === country.id);
                return `
                    <div class="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex justify-between items-center search-result"
                         data-id="${country.id}"
                    >
                        <span>${country.place_name || 'Unknown Country'}</span>
                        <input 
                            type="checkbox" 
                            class="country-checkbox" 
                            ${isSelected ? 'checked' : ''}
                            data-id="${country.id}"
                        >
                    </div>
                `;
            }).join('');
            
            // Add event listeners to search results
            document.querySelectorAll('.search-result').forEach(result => {
                result.addEventListener('click', (e) => {
                    // Don't trigger if clicking on the checkbox
                    if (e.target.classList.contains('country-checkbox')) return;
                    
                    const countryId = result.getAttribute('data-id');
                    const country = results.find(c => c.id === countryId);
                    if (country) {
                        moveCameraToLocation(country);
                        if (state.highlightEnabled) {
                            toggleCountryHighlight(country);
                        }
                        searchInput.value = country.place_name || '';
                        searchResults.classList.add('hidden');
                    }
                });
            });
            
            // Add event listeners to checkboxes
            document.querySelectorAll('.country-checkbox').forEach(checkbox => {
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const countryId = checkbox.getAttribute('data-id');
                    const country = results.find(c => c.id === countryId);
                    if (country) {
                        toggleCountryHighlight(country);
                    }
                });
            });
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.classList.add('hidden');
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);