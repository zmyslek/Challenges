import maplibregl from 'maplibre-gl';

const MAP_STYLE = 'https://api.maptiler.com/maps/0196a72c-f543-7d0f-a1dd-d13762e765b7/style.json?key=FelxstvCdS6k0g9YnLdK';

let map;
let highlightEnabled = true;
let geoJsonCache = null;
let state = null;

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
  console.log("map:", map);
  console.log("geoJsonCache:", geoJsonCache);
  console.log("state:", state);
  console.log("state?.selectedCountries:", state?.selectedCountries);

  if (!map || !geoJsonCache || !state?.selectedCountries) {
    console.warn("Highlight skipped: Missing map, geoJson, or selectedCountries");
    return;
  }

  if (!map.isStyleLoaded()) {
    map.once('idle', () => {
      console.log("Map is now idle, retrying highlight");
      updateHighlightedCountries();
    });
    console.warn("Map not ready, deferring highlight");
    return;
  }

  // Find matching features by ISO Alpha-2 code
  const selectedFeatures = geoJsonCache.features.filter(feature => {
    const countryCode = feature.properties['ISO3166-1-Alpha-2'];
    return state.selectedCountries.some(c => c.id === countryCode);
  });

  console.log("Highlighting countries:", 
    state.selectedCountries.map(c => c.id),
    "Matched features:", 
    selectedFeatures.map(f => f.properties['ISO3166-1-Alpha-2'])
  );

  // If the highlight source doesn't exist yet, create it
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
        'fill-opacity': 0.6,
        'fill-outline-color': '#ff1493'
      }
    }, 'countries-outline-layer');
  } else {
    // If the source exists, update it
    const source = map.getSource('countries-highlight-source');
    source.setData({
      type: 'FeatureCollection',
      features: highlightEnabled ? selectedFeatures : []
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