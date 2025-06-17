import config from '../config.json';
import { initializeMap, updateHighlightedCountries, toggleHighlightEnabled } from './map.js';

export const state = {
  selectedCountries: JSON.parse(localStorage.getItem('selectedCountries')) || [
    { id: 'FR', name: 'France' },
    { id: 'IT', name: 'Italy' },
    { id: 'JP', name: 'Japan' }
  ],
  userProfile: JSON.parse(localStorage.getItem('userProfile')) || {
    name: "Traveler",
    email: "traveler@example.com",
    trips: 12,
    joined: "2023-01-15"
  },
  galleryPhotos: JSON.parse(localStorage.getItem('galleryPhotos')) || [
    { id: 1, country: 'France', date: '2023-05-15', url: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=500' },
    { id: 2, country: 'Italy', date: '2023-06-20', url: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=500' },
    { id: 3, country: 'Japan', date: '2023-07-10', url: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=500' }
  ]
};

let countriesGeoJson = null;

function saveState() {
  localStorage.setItem('selectedCountries', JSON.stringify(state.selectedCountries));
  localStorage.setItem('userProfile', JSON.stringify(state.userProfile));
  localStorage.setItem('galleryPhotos', JSON.stringify(state.galleryPhotos));
}

// Setup search autocomplete & selection
function setupSearchAutocomplete() {
  const searchInput = document.getElementById('searchInput');
  const suggestionsContainer = document.createElement('ul');
  suggestionsContainer.className = 'absolute bg-white border border-gray-300 rounded shadow max-h-48 overflow-y-auto w-full z-50';
  searchInput.parentNode.style.position = 'relative';
  searchInput.parentNode.appendChild(suggestionsContainer);

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    suggestionsContainer.innerHTML = '';
    if (!query) {
      suggestionsContainer.style.display = 'none';
      return;
    }
    const matches = countriesGeoJson.features.filter(f => {
      const name = f.properties.name || f.properties.NAME || '';
      return name.toLowerCase().includes(query);
    }).slice(0, 10);
    if (matches.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }
    matches.forEach(f => {
      const name = f.properties.name || f.properties.NAME || '';
      const item = document.createElement('li');
      item.textContent = name;
      item.className = 'px-4 py-2 cursor-pointer hover:bg-pink-100';
      item.addEventListener('click', () => {
        addCountryToSelected(f);
        searchInput.value = '';
        suggestionsContainer.style.display = 'none';
      });
      suggestionsContainer.appendChild(item);
    });
    suggestionsContainer.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.parentNode.contains(e.target)) {
      suggestionsContainer.style.display = 'none';
    }
  });
}

function addCountryToSelected(feature) {
  const countryCode = feature.properties["ISO3166-1-Alpha-2"];
  if (!countryCode || countryCode === '-99') {
    alert(`"${feature.properties.name}" is not a recognized country and cannot be selected.`);
    return;
  }
  const countryName = feature.properties.name || 'Unknown';

  if (!countryCode) return;
  if (state.selectedCountries.some(c => c.id.toLowerCase() === countryCode.toLowerCase())) return;

  state.selectedCountries.push({ id: countryCode, name: countryName });
  saveState();
  updateHighlightedCountries();
  renderSelectedCountries();
}

function renderSelectedCountries() {
  const selectedCountriesList = document.getElementById('selectedCountriesList');
  if (!selectedCountriesList) return;

  selectedCountriesList.innerHTML = '';
  if (state.selectedCountries.length === 0) {
    selectedCountriesList.innerHTML = '<li class="text-gray-500 py-2">No countries selected</li>';
    return;
  }

  state.selectedCountries.forEach(c => {
    const li = document.createElement('li');
    li.className = 'flex justify-between items-center px-4 py-2 border-b border-gray-200';

    const span = document.createElement('span');
    span.textContent = c.name;

    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.className = 'text-red-500 hover:text-red-700 ml-4 text-sm';
    btn.addEventListener('click', () => {
      state.selectedCountries = state.selectedCountries.filter(sc => sc.id !== c.id);
      saveState();
      console.log(map.isStyleLoaded(), map && geoJsonCache); //it breaks here
      console.log('Selected countries after removal:', state.selectedCountries);
      updateHighlightedCountries();
      renderSelectedCountries();
    });

    li.appendChild(span);
    li.appendChild(btn);
    selectedCountriesList.appendChild(li);
  });
}

// Main init function
document.addEventListener('DOMContentLoaded', async () => {
  countriesGeoJson = await fetch('/assets/countries.geojson').then(res => res.json());

  // Initialize map, pass state.selectedCountries so map can highlight initially
  await initializeMap('app', state);
  updateHighlightedCountries();

  // Setup search and selected countries UI
  setupSearchAutocomplete();
  renderSelectedCountries();

  // Attach toggle highlight if you have a button for it
  const toggleBtn = document.getElementById('toggleHighlight');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleHighlightEnabled);
  }
});
