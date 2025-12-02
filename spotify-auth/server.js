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

// proxy: audio features for a track
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


app.listen(PORT, () => {
  console.log(`spotify-auth service listening on port ${PORT}`);
});
