/**
 * File: server.js (spotify-auth)
 * Author: Evan Van
 * Course: CS4471
 */

const express = require('express');

// node-fetch v3 in CommonJS (Node 22) – dynamic import wrapper
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 8081;

// =====================
// Section: Spotify App Token Management
// =====================

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyAppToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Spotify token error:', text);
    throw new Error('Failed to get Spotify token');
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;

  return cachedToken;
}

// =====================
// Section: Health + Token Broker Endpoints
// =====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/token/app', async (req, res) => {
  try {
    const token = await getSpotifyAppToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error('Token broker error:', err);
    res.status(500).json({ error: 'Failed to get app token' });
  }
});

// =====================
// Section: Track & Audio Features Proxies
// =====================

app.get('/spotify/audio-features/:trackId', async (req, res) => {
  try {
    const trackId = req.params.trackId;
    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/audio-features/${trackId}`;
    console.log('Calling Spotify:', url);

    const featuresRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const text = await featuresRes.text();
    console.log('Spotify audio-features status:', featuresRes.status);
    console.log('Spotify audio-features body:', text);

    if (!featuresRes.ok) {
      return res.status(featuresRes.status).json({
        error: 'Spotify audio-features request failed',
        status: featuresRes.status,
        raw: text
      });
    }

    const features = JSON.parse(text);
    res.json(features);
  } catch (err) {
    console.error('Proxy audio-features error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/spotify/tracks/:trackId', async (req, res) => {
  try {
    const trackId = req.params.trackId;
    const token = await getSpotifyAppToken();

    const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!trackRes.ok) {
      const text = await trackRes.text();
      console.error('Spotify tracks error:', text);
      return res.status(trackRes.status).json({ error: text });
    }

    const track = await trackRes.json();
    res.json(track);
  } catch (err) {
    console.error('Proxy tracks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// Section: Track & Playlist Search
// =====================

app.get('/spotify/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
      ? limitParam
      : 1;

    const market = req.query.market || 'US';
    const token = await getSpotifyAppToken();

    const url =
      `https://api.spotify.com/v1/search` +
      `?type=track` +
      `&limit=${limit}` +
      `&market=${encodeURIComponent(market)}` +
      `&q=${encodeURIComponent(q)}`;

    const searchRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Spotify search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Spotify search failed', raw: text });
    }

    const data = await searchRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/spotify/search-playlists', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
      ? limitParam
      : 10;

    const token = await getSpotifyAppToken();
    const url =
      `https://api.spotify.com/v1/search?type=playlist&limit=${limit}&q=${encodeURIComponent(q)}`;

    const searchRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Spotify playlist search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Spotify playlist search failed', raw: text });
    }

    const data = await searchRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy search-playlists error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// Section: Album Search & Details
// =====================

app.get('/spotify/search-albums', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const token = await getSpotifyAppToken();
    const url =
      `https://api.spotify.com/v1/search?type=album&limit=1&q=${encodeURIComponent(q)}`;

    const searchRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Spotify album search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Spotify album search failed', raw: text });
    }

    const data = await searchRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy search-albums error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/spotify/albums/:albumId', async (req, res) => {
  try {
    const albumId = req.params.albumId;
    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/albums/${albumId}?market=US`;
    const albumRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!albumRes.ok) {
      const text = await albumRes.text();
      console.error('Spotify album details error:', text);
      return res
        .status(albumRes.status)
        .json({ error: 'Spotify album details failed', raw: text });
    }

    const data = await albumRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy albums error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// Section: Artist Search & Details
// =====================

app.get('/spotify/search-artists', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
      ? limitParam
      : 1;

    const token = await getSpotifyAppToken();
    const url =
      `https://api.spotify.com/v1/search` +
      `?type=artist` +
      `&limit=${limit}` +
      `&q=${encodeURIComponent(q)}`;

    const searchRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Spotify artist search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Spotify artist search failed', raw: text });
    }

    const data = await searchRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy search-artists error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/spotify/artists/:artistId', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/artists/${artistId}`;
    const artistRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!artistRes.ok) {
      const text = await artistRes.text();
      console.error('Spotify artist details error:', text);
      return res
        .status(artistRes.status)
        .json({ error: 'Spotify artist details failed', raw: text });
    }

    const data = await artistRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy artist details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// Section: Artist Catalog & Top Tracks
// =====================

app.get('/spotify/artists/:artistId/albums', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const token = await getSpotifyAppToken();

    const includeGroups = req.query.include_groups || 'album,single';
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
      ? limitParam
      : 50;

    const url =
      `https://api.spotify.com/v1/artists/${artistId}/albums` +
      `?include_groups=${encodeURIComponent(includeGroups)}` +
      `&limit=${limit}`;

    const albumsRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!albumsRes.ok) {
      const text = await albumsRes.text();
      console.error('Spotify artist albums error:', text);
      return res
        .status(albumsRes.status)
        .json({ error: 'Spotify artist albums failed', raw: text });
    }

    const data = await albumsRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy artist albums error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/spotify/artists/:artistId/top-tracks', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const token = await getSpotifyAppToken();

    const market = req.query.market || 'US';

    const url =
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${encodeURIComponent(market)}`;
    const topRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!topRes.ok) {
      const text = await topRes.text();
      console.error('Spotify artist top-tracks error:', text);
      return res
        .status(topRes.status)
        .json({ error: 'Spotify artist top-tracks failed', raw: text });
    }

    const data = await topRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy artists top-tracks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// Section: Related Artists
// =====================

app.get('/spotify/artists/:artistId/related-artists', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/artists/${artistId}/related-artists`;
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('Spotify related-artists error:', text);
      return res
        .status(r.status)
        .json({ error: 'Spotify related-artists failed', raw: text });
    }

    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy related-artists error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// Section: Server Startup
// =====================

app.listen(PORT, () => {
  console.log(`spotify-auth service listening on port ${PORT}`);
});