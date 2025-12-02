const express = require('express');

// node-fetch v3 in CommonJS (Node 22) – dynamic import wrapper
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 8081;

// Spotify app credentials (ONLY live on backend, never frontend)
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// simple in-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyAppToken() {
  const now = Date.now();

  // reuse token if still valid
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
  // expires_in is seconds – refresh 60s before expiry
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;

  return cachedToken;
}

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// optional: token broker for other services
app.get('/token/app', async (req, res) => {
  try {
    const token = await getSpotifyAppToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error('Token broker error:', err);
    res.status(500).json({ error: 'Failed to get app token' });
  }
});

// proxy: audio features for a track (kept for potential future use)
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

// proxy: track details
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

// Proxy: search for a track by name (or query string)
// GET /spotify/search?q=mr brightside
app.get('/spotify/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(q)}`;
    const searchRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Spotify search error:', text);
      return res.status(searchRes.status).json({ error: 'Spotify search failed', raw: text });
    }

    const data = await searchRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search playlists by name (kept for future)
app.get('/spotify/search-playlists', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const token = await getSpotifyAppToken();
    const url = `https://api.spotify.com/v1/search?type=playlist&limit=1&q=${encodeURIComponent(q)}`;

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

// Get playlist details (kept for future)
// GET /spotify/playlists/:playlistId
app.get('/spotify/playlists/:playlistId', async (req, res) => {
  try {
    const playlistId = req.params.playlistId;
    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/playlists/${playlistId}?market=US&limit=100`;
    const playlistRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!playlistRes.ok) {
      const text = await playlistRes.text();
      console.error('Spotify playlist details error:', text);
      return res
        .status(playlistRes.status)
        .json({ error: 'Spotify playlist details failed', raw: text });
    }

    const data = await playlistRes.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy playlists error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Search albums by name
// GET /spotify/search-albums?q=After%20Hours
app.get('/spotify/search-albums', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing q query parameter' });
    }

    const token = await getSpotifyAppToken();
    const url = `https://api.spotify.com/v1/search?type=album&limit=1&q=${encodeURIComponent(q)}`;

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

// NEW: Get album details (including tracks)
// GET /spotify/albums/:albumId
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

// NEW: Artist's top tracks
// GET /spotify/artists/:artistId/top-tracks
app.get('/spotify/artists/:artistId/top-tracks', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const token = await getSpotifyAppToken();

    const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`;
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

// NEW: Related artists
// GET /spotify/artists/:artistId/related-artists
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

app.listen(PORT, () => {
  console.log(`spotify-auth service listening on port ${PORT}`);
});
