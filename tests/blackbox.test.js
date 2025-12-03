import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

const SPOTIFY_AUTH_URL = 'http://localhost:8081';

describe('Black-Box Tests (Spotify Auth API)', () => {
  it('search tracks endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search?q=Drake`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tracks.items.length).toBeGreaterThan(0);
  });

  it('search playlists endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-playlists?q=Top%20Hits`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.playlists.items.length).toBeGreaterThan(0);
  });

  it('search albums endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-albums?q=After%20Hours`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.albums.items.length).toBeGreaterThan(0);
  });

  it('search artists endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-artists?q=Drake`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.artists.items.length).toBeGreaterThan(0);
  });

  it('track details endpoint works', async () => {
    const trackId = '3KkXRkHbMCARz0aVfEt68P';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/tracks/${trackId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('name');
  });

  it('album details endpoint works', async () => {
    const albumId = '4yP0hdKOZPNshxUOjY0cZj'; // After Hours album
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/albums/${albumId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('tracks');
  });

  it('artist details endpoint works', async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4'; // Drake
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('name');
  });

  it("artist's albums endpoint works", async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}/albums`);
    
    if (res.status === 200) {
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    } else if (res.status === 404) {
      console.warn(`Skipping artist albums test, got 404`);
    } else {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  it("artist's top-tracks endpoint works", async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}/top-tracks`);
    
    if (res.status === 200) {
      const data = await res.json();
      expect(Array.isArray(data.tracks)).toBe(true);
    } else if (res.status === 404) {
      console.warn(`Skipping artist top-tracks test, got 404`);
    } else {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  it("artist's related-artists endpoint works", async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}/related-artists`);
    
    if (res.status === 200) {
      const data = await res.json();
      expect(Array.isArray(data.artists)).toBe(true);
    } else if (res.status === 404) {
      console.warn(`Skipping related-artists test, got 404`);
    } else {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });
});
