import maplibregl from 'maplibre-gl';

const MAP_STYLE = 'https://api.maptiler.com/maps/0196a72c-f543-7d0f-a1dd-d13762e765b7/style.json?key=FelxstvCdS6k0g9YnLdK';

let map;
let highlightEnabled = true;
let geoJsonCache = null;
let state = null;

function normalizeName(name) {
  return name
    ?.toLowerCase()
    .normalize('NFD') // decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .trim();
}
function normalizeId(str) {
    return str?.toString().toLowerCase().trim() || '';
}
export async function initializeMap(containerId, sharedState) {
  state = sharedState;

  map = new maplibregl.Map({
    container: containerId,
    style: MAP_STYLE,
    center: [0, 0],
    zoom: 1.5
  });

  // Load local GeoJSON
  try {
    const response = await fetch('./assets/countries.geojson');
    geoJsonCache = await response.json();
    state.selectedCountries = state.selectedCountries.filter(c => c.id !== '-99');
    console.log("Loaded local GeoJSON with features:", geoJsonCache.features.length);
  } catch (error) {
    console.error("Failed to load local GeoJSON:", error);
    return;
  }

  map.on('load', () => {
    // Add highlight source
    map.addSource('countries-highlight', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    // Add highlight layer
    map.addLayer({
      id: 'countries-highlight',
      type: 'fill',
      source: 'countries-highlight',
      paint: {
        'fill-color': '#ff69b4',
        'fill-opacity': 0.7,
        'fill-outline-color': '#ff1493'
      }
    });
  });

  if (state.selectedCountries?.length > 0) {
    updateHighlightedCountries();
  }
}

export function updateHighlightedCountries() {
  if (!map || !geoJsonCache || !state?.selectedCountries) {
    console.warn("Highlight skipped: Missing map, geoJson, or selectedCountries");
    return;
  }

  if (!map.isStyleLoaded()) {
    map.once('idle', () => {
      updateHighlightedCountries();
    });
    return;
  }

  if (!highlightEnabled) {
    // Clear highlights if disabled
    if (map.getSource('countries-highlight-source')) {
      map.getSource('countries-highlight-source').setData({
        type: 'FeatureCollection',
        features: []
      });
    }
    return;
  }

  // Normalize function to compare country names
  function normalizeName(name) {
    return name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
  }

  // Filter features by matching normalized country names from selectedCountries
  const selectedFeatures = geoJsonCache.features.filter(feature => {
    const featureName = normalizeName(feature.properties.name);
    return state.selectedCountries.some(c => normalizeName(c.name) === featureName);
  });

  // Add or update highlight source and layer
  if (!map.getSource('countries-highlight-source')) {
    map.addSource('countries-highlight-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: selectedFeatures
      }
    });

    map.addLayer({
      id: 'countries-highlight-layer',
      type: 'fill',
      source: 'countries-highlight-source',
      paint: {
        'fill-color': '#ff69b4',
        'fill-outline-color': '#ff1493'
      }
    });
  } else {
    const source = map.getSource('countries-highlight-source');
    source.setData({
      type: 'FeatureCollection',
      features: selectedFeatures
    });
  }
}

export function moveCameraToLocation(feature) {
  if (!map || !feature?.geometry) return;

  let coords = feature.geometry.coordinates;

  if (feature.geometry.type === 'Polygon') {
    coords = coords[0][0];
  } else if (feature.geometry.type === 'MultiPolygon') {
    coords = coords[0][0][0];
  }

  map.flyTo({
    center: coords,
    zoom: 4
  });
}

export function toggleHighlightEnabled() {
  highlightEnabled = !highlightEnabled;

  const btn = document.getElementById('toggleHighlight');
  if (btn) {
    btn.className = `p-3 rounded-lg transition ${
      highlightEnabled ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'
    }`;
    btn.setAttribute('aria-pressed', highlightEnabled.toString());
  }

  updateHighlightedCountries();
}