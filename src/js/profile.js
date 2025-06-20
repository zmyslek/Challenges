// profile.js
import { state } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const tripsEl = document.getElementById('profileTrips');
  const joinedEl = document.getElementById('profileJoined');
  const visitedEl = document.getElementById('visitedCountries');

  // Set profile data
  const profile = state.userProfile;
  const selectedCountries = state.selectedCountries || [];

  nameEl.textContent = profile.name || 'Traveler';
  emailEl.textContent = profile.email || '';
  tripsEl.textContent = selectedCountries.length;
  joinedEl.textContent = profile.joined
    ? new Date(profile.joined).toLocaleDateString()
    : '—';

  // Display selected countries
  visitedEl.innerHTML = '';
  if (selectedCountries.length === 0) {
    visitedEl.innerHTML = `<li class="py-3 text-gray-500 italic">No countries selected yet.</li>`;
  } else {
    selectedCountries.forEach(country => {
      const li = document.createElement('li');
      li.className = 'py-3 cursor-pointer hover:bg-blue-50 transition-colors';
      li.textContent = country.name;
      li.addEventListener('click', () => {
        alert(`You clicked ${country.name}`);
      });
      visitedEl.appendChild(li);
    });
  }
});
