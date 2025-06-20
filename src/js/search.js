// Search locations
async function searchLocations(query) {
  if (!query) return [];

  // First try local search
  const localResults = await searchInLocalGeoJson(query);
  if (localResults.length > 0) return localResults;

  // Fall back to API search
  return await searchViaApi(query);
}

// Search in local GeoJSON
async function searchInLocalGeoJson(query) {
  try {
    const response = await fetch('/assets/countries.geojson');
    const countriesGeoJson = await response.json();

    const lowerQuery = query.toLowerCase();

    return countriesGeoJson.features
      .filter(feature => {
        const name = feature.properties.name?.toString().toLowerCase() || '';
        return name.includes(lowerQuery);
      })
      .map(feature => {
        const name = feature.properties.name;
        // Use name as id always (normalized for safety)
        const id = name.trim().toLowerCase();

        return {
          id: id,
          place_name: name,
          geometry: feature.geometry,
          properties: feature.properties
        };
      }
    );

  } catch (error) {
    console.error('Error in local search:', error);
    return [];
  }
}

// Search via API
async function searchViaApi(query) {
  try {
    const response = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${window.MAPTILER_KEY}&types=country&limit=5`
    );
    const data = await response.json();
    return data.features.map(feature => {
      const name = feature.properties?.name || 'unknown';
      feature.id = name.trim().toLowerCase();
      return feature;
    });

  } catch (error) {
    console.error('API search error:', error);
    return [];
  }
}

// Setup search functionality
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
        const isSelected = state.selectedCountries.some(c => c.id === (country.id || country.place_name || country.properties?.name || '').trim().toLowerCase());
        return `
                    <div class="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex justify-between items-center search-result"
                         data-id="${country.id}"
                    >
                        <span>${country.place_name || 'Unknown Country'}</span>
                        <input 
                            type="checkbox" 
                            class="country-checkbox rounded text-pink-500" 
                            ${isSelected ? 'checked' : ''}
                            data-id="${country.id}"
                        >
                    </div>
                `;
      }).join('');

      // Add event listeners to search results
      document.querySelectorAll('.search-result').forEach(result => {
        result.addEventListener('click', (e) => {
          if (e.target.classList.contains('country-checkbox')) return;

          const countryId = result.getAttribute('data-id');
          const country = results.find(c => c.id === countryId);
          if (country) {
            moveCameraToLocation(country);
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

function normalizeName(name) {
  return name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

function toggleCountryHighlight(country) {
  const countryName = (country.place_name || country.properties?.name || 'unknown');
  const normalized = normalizeName(countryName);

  const index = state.selectedCountries.findIndex(c => c.id === normalized);
  if (index >= 0) {
    state.selectedCountries.splice(index, 1);
  } else {
    state.selectedCountries.push({
      id: normalized,
      name: countryName
    });
  }

  localStorage.setItem('selectedCountries', JSON.stringify(state.selectedCountries));
  updateSelectedCountriesList();

  if (highlightEnabled) {
    updateHighlightedCountries(); // uses cached geoJson inside map.js
  }
}

// Update selected countries list
function updateSelectedCountriesList() {
  const listContainer = document.getElementById('selectedCountriesList');
  if (listContainer) {
    listContainer.innerHTML = state.selectedCountries.length > 0
      ? state.selectedCountries.map(country => `
                <li class="py-3 flex justify-between items-center">
                    <span class="text-blue-600">${country.name || 'Unknown Country'}</span>
                    <button class="text-red-500 hover:text-red-700 delete-btn" data-id="${country.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </li>
            `).join('')
      : '<li class="py-3 text-gray-500">No countries selected</li>';

    // Add delete button handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const countryId = btn.getAttribute('data-id').trim().toLowerCase();
        const country = state.selectedCountries.find(c => c.id === countryId);
        if (country) {
          toggleCountryHighlight(country);
        }
      });
    });
  }
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('searchInput')) {
    setupSearch();
    updateSelectedCountriesList();

    // Initialize highlight toggle button
    document.getElementById('toggleHighlight').addEventListener('click', toggleHighlightEnabled);
  }
});