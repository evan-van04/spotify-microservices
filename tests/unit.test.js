import { config } from 'dotenv';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSpotifyAppToken } from '../spotify-auth/server.js';

// Load .env from the spotify-auth directory
config({ path: './spotify-auth/.env' });

describe('Unit Tests - Spotify Auth', () => {     

  let originalId;
  let originalSecret;

  beforeEach(() => {
    originalId = process.env.SPOTIFY_CLIENT_ID;
    originalSecret = process.env.SPOTIFY_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env.SPOTIFY_CLIENT_ID = originalId;
    process.env.SPOTIFY_CLIENT_SECRET = originalSecret;
  });


  it('returns a valid token', async () => {
    const token = await getSpotifyAppToken();
    console.log('Spotify App Token:', token); // <- This prints the token
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });


  it('throws error when env vars are missing', async () => {
    process.env.SPOTIFY_CLIENT_ID = '';
    process.env.SPOTIFY_CLIENT_SECRET = '';

    await expect(getSpotifyAppToken()).rejects.toThrow(
      'Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars'
    );
  });


  it('never returns null or undefined', async () => {
    const token = await getSpotifyAppToken();
    expect(token).not.toBeNull();
    expect(token).not.toBeUndefined();
  });


  it('returns a reasonably long token', async () => {
    const token = await getSpotifyAppToken();
    expect(token.length).toBeGreaterThan(10);
  });


  it('returns a new token on each call', async () => {
    const token1 = await getSpotifyAppToken();
    const token2 = await getSpotifyAppToken();
    expect(token1).not.toEqual(token2);
  });


  it('contains only valid characters', async () => {
    const token = await getSpotifyAppToken();
    expect(token).toMatch(/^[A-Za-z0-9\-._]+$/);
  });


  it('contains no spaces', async () => {
    const token = await getSpotifyAppToken();
    expect(token).not.toContain(' ');
  });

});
