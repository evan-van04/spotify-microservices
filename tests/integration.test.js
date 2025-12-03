import { describe, it, beforeAll, expect } from 'vitest';
import fetch from 'node-fetch';

const SERVICE_REGISTRY_URL = 'http://localhost:8082';
const SPOTIFY_AUTH_URL = 'http://localhost:8081';

describe('Integration Tests - Service Registry', () => {
  beforeAll(async () => {
    await fetch(`${SERVICE_REGISTRY_URL}/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'spotify-auth',
        name: 'Spotify Auth',
        url: SPOTIFY_AUTH_URL
      })
    });
  });

  it('service appears in registry', async () => {
    const res = await fetch(`${SERVICE_REGISTRY_URL}/services`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.some(svc => svc.id === 'spotify-auth')).toBe(true);
  });

  it('service registry search works', async () => {
    const res = await fetch(`${SERVICE_REGISTRY_URL}/services/search?q=spotify`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
  });
});

