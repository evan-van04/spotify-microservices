import { describe, it, expect } from 'vitest';
import { getSpotifyAppToken } from '../../spotify-auth/server.js';

describe('Unit Tests - Spotify Auth', () => {
  it('getSpotifyAppToken() returns a valid token', async () => {
    const token = await getSpotifyAppToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('getSpotifyAppToken() fails if client ID/secret missing', async () => {
    const originalId = process.env.SPOTIFY_CLIENT_ID;
    const originalSecret = process.env.SPOTIFY_CLIENT_SECRET;

    process.env.SPOTIFY_CLIENT_ID = '';
    process.env.SPOTIFY_CLIENT_SECRET = '';

    await expect(getSpotifyAppToken()).rejects.toThrow(
      'Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars'
    );

    process.env.SPOTIFY_CLIENT_ID = originalId;
    process.env.SPOTIFY_CLIENT_SECRET = originalSecret;
  });
});
