// server.js  --- TrackIQ Service Registry (primary OR backup)

const express = require('express');

const app = express();

// PORT is injected by Render; fallback for local dev.
const PORT = process.env.PORT || 8082;

// Just for logging so you can distinguish primary vs backup
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'service-registry';

// Built-in JSON body parser
app.use(express.json());

// In-memory store: id -> service object
// A "service" looks like:
// {
//   id: 'song-stats',
//   name: 'Song Stats',
//   description: '...',
//   url: 'https://trackiq-spotify-main.onrender.com/song-stats.html',
//   createdAt: '2025-12-02T...',
//   updatedAt: '2025-12-02T...'
// }
const services = new Map();

/**
 * Basic health endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    instance: INSTANCE_NAME,
    serviceCount: services.size
  });
});

/**
 * Register or update a service.
 * POST /services/register
 * Body: { id, name, description, url }
 */
app.post('/services/register', (req, res) => {
  const { id, name, description, url } = req.body || {};

  if (!id || !name || !url) {
    return res.status(400).json({
      error: 'Missing required fields: id, name, url'
    });
  }

  const now = new Date().toISOString();
  const existing = services.get(id);

  const service = {
    id,
    name,
    description: description || '',
    url,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  services.set(id, service);

  console.log(
    `[${INSTANCE_NAME}] Registered service "${id}" -> ${url}`
  );

  res.status(existing ? 200 : 201).json(service);
});

/**
 * List all services (no filtering).
 * GET /services
 */
app.get('/services', (req, res) => {
  const all = Array.from(services.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  res.json(all);
});

/**
 * Search services by q across id, name, description, url (case-insensitive).
 * GET /services/search?q=song
 */
app.get('/services/search', (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();

  let results = Array.from(services.values());

  if (q) {
    results = results.filter((svc) => {
      const haystack = `${svc.id} ${svc.name} ${svc.description} ${svc.url}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  // Sort alphabetically by name for a nicer UI
  results.sort((a, b) => a.name.localeCompare(b.name));

  res.json(results);
});

/**
 * Delete a service by id.
 * DELETE /services/:id
 */
app.delete('/services/:id', (req, res) => {
  const id = req.params.id;
  if (!services.has(id)) {
    return res.status(404).json({ error: 'Service not found' });
  }

  services.delete(id);
  console.log(`[${INSTANCE_NAME}] Deleted service "${id}"`);
  res.status(204).send();
});

// Optional: periodic log so you know it’s alive
setInterval(() => {
  console.log(
    `[${INSTANCE_NAME}] heartbeat – ${services.size} services registered`
  );
}, 60 * 1000); // every 60s

app.listen(PORT, () => {
  console.log(
    `[${INSTANCE_NAME}] Service Registry listening on port ${PORT}`
  );
});