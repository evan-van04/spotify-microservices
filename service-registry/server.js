const REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;

// service-registry/server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json());

// In-memory registry
// You’ll auto-register from your 8080 service later.
let services = [];

// Helper to find index by id
function findServiceIndex(id) {
  return services.findIndex(s => s.id === id);
}

// GET /services - list all services
app.get('/services', (req, res) => {
  res.json({ services });
});

// GET /services/search?q=...
// Search in name + description (case-insensitive)
app.get('/services/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) {
    return res.json({ services });
  }
  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.description || '').toLowerCase().includes(q)
  );
  res.json({ services: filtered });
});

// POST /services/register
// { id, name, description, url }
app.post('/services/register', (req, res) => {
  const { id, name, description, url } = req.body;

  if (!id || !name || !url) {
    return res.status(400).json({
      error: 'Missing required fields: id, name, url'
    });
  }

  const idx = findServiceIndex(id);
  const service = { id, name, description: description || '', url };

  if (idx === -1) {
    services.push(service);
    console.log('Registered new service:', service);
  } else {
    services[idx] = service;
    console.log('Updated service:', service);
  }

  res.json({ ok: true, service });
});

// DELETE /services/:id - unregister a service
app.delete('/services/:id', (req, res) => {
  const id = req.params.id;
  const idx = findServiceIndex(id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const removed = services.splice(idx, 1)[0];
  console.log('Unregistered service:', removed);
  res.json({ ok: true, removed });
});

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', servicesCount: services.length });
});

async function registerServicesWithRegistry() {
  if (!REGISTRY_URL) {
    console.warn('SERVICE_REGISTRY_URL not set; skipping registration');
    return;
  }

  const servicesToRegister = [
    {
      id: 'song-stats',
      name: 'Song Stats',
      description: 'Analyze a track’s popularity, duration, and reach.',
      url: 'https://trackiq-spotify-main.onrender.com/song-stats.html'
    },
    {
      id: 'song-similarity',
      name: 'Song Similarity',
      description: 'Find 5 similar tracks based on artist, era, and metadata.',
      url: 'https://trackiq-spotify-main.onrender.com/song-similarity.html'
    },
    {
      id: 'trend-analytics',
      name: 'Trend Analytics',
      description: 'See top tracks and release-year trends by country.',
      url: 'https://trackiq-spotify-main.onrender.com/trend-analytics.html'
    },
    {
      id: 'artist-stats',
      name: 'Artist Stats',
      description: 'Deep dive on any Spotify artist: image, popularity, and top tracks.',
      url: 'https://trackiq-spotify-main.onrender.com/artist-stats.html'
    },
    {
      id: 'album-analyzer',
      name: 'Album Analyzer',
      description: 'Rank tracks on an album and compare popularity & duration.',
      url: 'https://trackiq-spotify-main.onrender.com/album-analyzer.html'
    }
  ];

  for (const svc of servicesToRegister) {
    try {
      await fetch(`${REGISTRY_URL}/services/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(svc)
      });
      console.log('Registered with registry:', svc.id);
    } catch (err) {
      console.error('Failed to register service', svc.id, err);
    }
  }
}

app.listen(PORT, () => {
  console.log(`Service Registry running on port ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`TrackIQ main service running on port ${PORT}`);
  registerServicesWithRegistry();
});