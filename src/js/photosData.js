// photosData.js

function normalizeName(name) {
  return name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

window.loadPhotosByCountry = new Promise((resolve, reject) => {
  fetch('assets/countries.geojson')
    .then(response => response.json())
    .then(geojson => {
      const countries = geojson.features.map(f => f.properties.name);
      
      const photosByCountry = {};
      let idCounter = 1000;

      countries.forEach(country => {
        const key = normalizeName(country);
        photosByCountry[key] = [];
        for (let i = 0; i < 10; i++) {
          idCounter++;
          photosByCountry[key].push(`https://picsum.photos/seed/${encodeURIComponent(key + i)}/400/300`);

        }
      });

      window.photosByCountry = photosByCountry;
      console.log('Photos by country loaded:', Object.keys(photosByCountry).length);
      resolve();
    })
    .catch(err => {
      console.error(err);
      reject(err);
    });
});
