import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

const SPOTIFY_AUTH_URL = 'http://localhost:8081';

describe('Regression Tests - Spotify Auth', () => {
  it('search tracks endpoint still works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search?q=The%20Weeknd`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.tracks.items.length).toBeGreaterThan(0);
  });

  it('search albums endpoint still works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-albums?q=After%20Hours`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.albums.items.length).toBeGreaterThan(0);
  });
});

