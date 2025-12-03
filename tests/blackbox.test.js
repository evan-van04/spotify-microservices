import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

const SPOTIFY_AUTH_URL = 'http://localhost:8081';

describe('Black-Box Tests (Spotify Auth API)', () => {
  it('search tracks endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search?q=Drake`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.tracks.items.length).toBeGreaterThan(0);
  });

  it('search playlists endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-playlists?q=Top%20Hits`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.playlists.items.length).toBeGreaterThan(0);
  });

  it('search albums endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-albums?q=After%20Hours`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.albums.items.length).toBeGreaterThan(0);
  });

  it('search artists endpoint works', async () => {
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/search-artists?q=Drake`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.artists.items.length).toBeGreaterThan(0);
  });

  it('audio-features endpoint works for a track', async () => {
    // Replace with a valid track ID
    const trackId = '3KkXRkHbMCARz0aVfEt68P';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/audio-features/${trackId}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('danceability');
  });

  it('tracks endpoint works for a track', async () => {
    const trackId = '3KkXRkHbMCARz0aVfEt68P';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/tracks/${trackId}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('name');
  });

  it('album details endpoint works', async () => {
    const albumId = '4yP0hdKOZPNshxUOjY0cZj'; // After Hours album
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/albums/${albumId}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('tracks');
  });

  it('artist details endpoint works', async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4'; // Drake
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('name');
  });

  it("artist's albums endpoint works", async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}/albums`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("artist's top-tracks endpoint works", async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}/top-tracks`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.tracks)).toBe(true);
  });

  it("artist's related-artists endpoint works", async () => {
    const artistId = '3TVXtAsR1Inumwj472S9r4';
    const res = await fetch(`${SPOTIFY_AUTH_URL}/spotify/artists/${artistId}/related-artists`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.artists)).toBe(true);
  });
});
