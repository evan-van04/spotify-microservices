const express = require('express');
const path = require('path');

// node-fetch v3 in CommonJS
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 8080;

// Base URL for spotify-auth microservice
const SPOTIFY_AUTH_BASE_URL =
  process.env.SPOTIFY_AUTH_BASE_URL || 'http://localhost:8081';

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Root route -> landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper: compute a simple mood label from audio features
function computeMoodLabel(features) {
  const { energy, danceability, valence, acousticness } = features;

  if (energy == null || danceability == null || valence == null || acousticness == null) {
    return 'mood unavailable (no audio features)';
  }

  if (energy > 0.7 && danceability > 0.6 && valence > 0.6) {
    return 'high-energy, happy, and danceable';
  }
  if (energy < 0.4 && acousticness > 0.5 && valence < 0.5) {
    return 'chill, acoustic, and a bit moody';
  }
  if (valence < 0.3) {
    return 'sad / emotional';
  }
  if (energy > 0.8) {
    return 'very energetic / hype';
  }
  return 'balanced / mixed vibe';
}

// API: Song Stats
// GET /api/song-stats?q=<song name or query>
app.get('/api/song-stats', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Missing q query parameter (song name or query)' });
    }

    // 1) Search for the track via spotify-auth
    const searchUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/search?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Song Stats: search error:', text);
      return res.status(searchRes.status).json({ error: 'Failed to search track' });
    }

    const searchData = await searchRes.json();
    const items = searchData?.tracks?.items || [];

    if (items.length === 0) {
      return res.status(404).json({ error: 'No track found for that query' });
    }

    const track = items[0]; // best match
    const trackId = track.id;

    // 2) Get audio features + full track details in parallel
    const featuresUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/audio-features/${trackId}`;
    const trackUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/tracks/${trackId}`;

    const [featuresRes, trackRes] = await Promise.all([
      fetch(featuresUrl),
      fetch(trackUrl)
    ]);

    let features = {};
    let featuresOk = featuresRes.ok;

    if (featuresOk) {
      features = await featuresRes.json();
    } else {
      // fallback if audio-features 403s – keep the app working
      const text = await featuresRes.text();
      console.error('Song Stats: audio-features error (fallback):', text);
      features = {
        tempo: null,
        energy: null,
        valence: null,
        danceability: null,
        acousticness: null
      };
    }

    if (!trackRes.ok) {
      const text = await trackRes.text();
      console.error('Song Stats: track details error:', text);
      return res.status(trackRes.status).json({ error: 'Failed to fetch track details' });
    }

    const fullTrack = await trackRes.json();

    const result = {
      trackId: fullTrack.id,
      trackName: fullTrack.name,
      artistName: fullTrack.artists?.map(a => a.name).join(', '),
      albumName: fullTrack.album?.name,
      albumImage: fullTrack.album?.images?.[0]?.url || null,
      popularity: fullTrack.popularity,
      durationMs: fullTrack.duration_ms,

      tempo: features.tempo,
      energy: features.energy,
      valence: features.valence,
      danceability: features.danceability,
      acousticness: features.acousticness,

      moodLabel: computeMoodLabel(features),
      audioFeaturesAvailable: featuresOk
    };

    res.json(result);
  } catch (err) {
    console.error('Song Stats endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Spotify UI & Song Stats service running at http://localhost:${PORT}`);
});
