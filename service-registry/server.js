/**
 * File: server.js (TrackIQ Service Registry)
 * Author: Evan Van
 * Course: CS4471
 */

const express = require('express');
const app = express();

const PORT = process.env.PORT || 8082;
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'service-registry';

app.use(express.json());

// In-memory store of registered services
const services = new Map();

// =====================
// Section: Health / Root Endpoint
// =====================

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    instance: INSTANCE_NAME,
    serviceCount: services.size
  });
});

// =====================
// Section: Register or Update a Service
// =====================

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

  console.log(`[${INSTANCE_NAME}] Registered service "${id}" -> ${url}`);

  res.status(existing ? 200 : 201).json(service);
});

// =====================
// Section: List All Services
// =====================

app.get('/services', (req, res) => {
  const all = Array.from(services.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  res.json(all);
});

// =====================
// Section: Search Services
// =====================

app.get('/services/search', (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  let results = Array.from(services.values());

  if (q) {
    results = results.filter((svc) => {
      const haystack = `${svc.id} ${svc.name} ${svc.description} ${svc.url}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  res.json(results);
});

// =====================
// Section: Delete a Service
// =====================

app.delete('/services/:id', (req, res) => {
  const id = req.params.id;

  if (!services.has(id)) {
    return res.status(404).json({ error: 'Service not found' });
  }

  services.delete(id);
  console.log(`[${INSTANCE_NAME}] Deleted service "${id}"`);
  res.status(204).send();
});

// =====================
// Section: Periodic Heartbeat Log
// =====================

setInterval(() => {
  console.log(
    `[${INSTANCE_NAME}] heartbeat – ${services.size} services registered`
  );
}, 60 * 1000);

// =====================
// Section: Server Startup
// =====================

app.listen(PORT, () => {
  console.log(
    `[${INSTANCE_NAME}] Service Registry listening on port ${PORT}`
  );
});