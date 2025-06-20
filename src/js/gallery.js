// gallery.js

const state = {
  selectedCountries: JSON.parse(localStorage.getItem('selectedCountries')) || []
};

function normalizeName(name) {
  return name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
}

function renderGallery() {
  const galleryPhotos = document.getElementById('galleryPhotos');
  galleryPhotos.innerHTML = '';

  if (state.selectedCountries.length === 0) {
    galleryPhotos.innerHTML = '<p class="text-gray-500 italic">No countries selected. Use the search to add countries.</p>';
    return;
  }

  state.selectedCountries.forEach(country => {
    const countryId = normalizeName(country.name);
    const photos = window.photosByCountry?.[countryId] || [];

    // Country title
    const countryTitle = document.createElement('h3');
    countryTitle.className = 'text-2xl font-semibold mb-4 mt-12 border-b pb-2 border-gray-300';
    countryTitle.textContent = country.name;
    galleryPhotos.appendChild(countryTitle);

    if (photos.length === 0) {
      const noPhotoDiv = document.createElement('div');
      noPhotoDiv.className = 'mb-6 text-gray-400 italic';
      noPhotoDiv.textContent = 'No photos available.';
      galleryPhotos.appendChild(noPhotoDiv);
      return;
    }

    // Photo grid: one row, 10 columns, horizontally scrollable
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-10 gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100';

    photos.slice(0, 10).forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.addEventListener('click', () => {
        document.getElementById('modalImage').src = url;
        document.getElementById('photoModal').classList.remove('hidden');
      });

      img.alt = `Photo from ${country.name}`;
      img.className = `
        rounded-lg shadow-md
        object-cover
        w-24 h-24 md:w-32 md:h-32
        transition-transform duration-300
        hover:scale-105 hover:shadow-xl
        cursor-pointer
        select-none
      `.trim().replace(/\s+/g, ' ');
      grid.appendChild(img);
    });

    galleryPhotos.appendChild(grid);
  });
}

function updateSelectedCountriesList() {
  const listContainer = document.getElementById('selectedCountriesList');
  if (!listContainer) return;

  if (state.selectedCountries.length === 0) {
    listContainer.innerHTML = '<li class="py-2 text-gray-500 italic">No countries selected.</li>';
  } else {
    listContainer.innerHTML = state.selectedCountries.map(country => `
      <li class="py-2 flex justify-between items-center border-b border-gray-200">
        <span class="text-blue-700 font-medium">${country.name}</span>
        <button class="text-red-500 hover:text-red-700 delete-btn" data-name="${country.name}" aria-label="Remove ${country.name}">
          <i class="fas fa-trash"></i>
        </button>
      </li>
    `).join('');

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const countryName = btn.getAttribute('data-name');
        removeCountryByName(countryName);
      });
    });
  }
}

function removeCountryByName(name) {
  state.selectedCountries = state.selectedCountries.filter(c => c.name !== name);
  saveAndUpdate();
}

function saveAndUpdate() {
  localStorage.setItem('selectedCountries', JSON.stringify(state.selectedCountries));
  updateSelectedCountriesList();
  renderGallery();
}

function addCountry(country) {
  if (!state.selectedCountries.some(c => c.name === country.name)) {
    state.selectedCountries.push(country);
    saveAndUpdate();
  }
}

// Add default countries if none selected
if (state.selectedCountries.length === 0) {
  addCountry({ id: 'france', name: 'France' });
  addCountry({ id: 'greece', name: 'Greece' });
}

// Wait for photosData to load before rendering
window.loadPhotosByCountry.then(() => {
  updateSelectedCountriesList();
  renderGallery();
}).catch(err => {
  console.error('Failed to load photos data:', err);
});
// Modal close handler
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('photoModal').classList.add('hidden');
});

document.getElementById('photoModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.add('hidden');
  }
});
