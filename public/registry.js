// public/registry.js

async function fetchServices(queryText) {
  const params = new URLSearchParams();
  if (queryText && queryText.trim() !== '') {
    params.set('q', queryText.trim());
  }

  const url = '/api/services/search' + (params.toString() ? `?${params.toString()}` : '');
  console.log('Fetching services from:', url);

  const res = await fetch(url);

  if (!res.ok) {
    console.error('Service search failed:', res.status);
    throw new Error('Unable to contact Service Registry');
  }

  const data = await res.json();
  console.log('Registry response:', data);
  return data.services || [];
}

function renderServices(services) {
  const container = document.getElementById('serviceResults');
  if (!container) return;

  if (!services.length) {
    container.innerHTML = `
      <p class="no-results">
        No services found. Try a different keyword.
      </p>
    `;
    return;
  }

  container.innerHTML = services
    .map(
      (s) => `
      <a class="service-item" href="${s.url}" target="_blank" rel="noopener">
        <div class="service-header">
          <h3>${s.name}</h3>
          <span class="service-id">${s.id}</span>
        </div>
        <p class="service-desc">${s.description}</p>
        <span class="service-url">${s.url}</span>
      </a>
    `
    )
    .join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('registry.js loaded, DOM ready');

  const form = document.getElementById('serviceSearchForm');
  const input = document.getElementById('serviceSearchInput');

  // 1) Load ALL services on page load
  try {
    const services = await fetchServices('');
    renderServices(services);
  } catch (err) {
    console.error(err);
    const container = document.getElementById('serviceResults');
    if (container) {
      container.innerHTML = `
        <p class="no-results error">
          Unable to contact Service Registry.
        </p>
      `;
    }
  }

  // 2) Wire search form
  if (form && input) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // 🔴 prevents the redirect to /? 
      console.log('Service search submitted with query:', input.value);

      try {
        const services = await fetchServices(input.value);
        renderServices(services);
      } catch (err) {
        console.error(err);
        const container = document.getElementById('serviceResults');
        if (container) {
          container.innerHTML = `
            <p class="no-results error">
              Unable to contact Service Registry.
            </p>
          `;
        }
      }
    });
  } else {
    console.warn('serviceSearchForm or serviceSearchInput not found in DOM');
  }
});
