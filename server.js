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

// Helper: compute a simple popularity tier (derived stat)
function computePopularityTier(popularity) {
  if (popularity == null) return 'Popularity tier: Unknown';
  if (popularity >= 80) return 'Popularity tier: Global hit';
  if (popularity >= 60) return 'Popularity tier: Mainstream';
  if (popularity >= 40) return 'Popularity tier: Emerging artist';
  return 'Popularity tier: Niche / underground';
}

// API: Song Stats (metadata only – no audio features)
// GET /api/song-stats?q=<song name or query>
app.get('/api/song-stats', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        error: 'Missing q query parameter (song name or query)'
      });
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

    // take best match
    const track = items[0];

    // You *could* also refetch via /spotify/tracks/:id, but search gives plenty.
    const fullTrack = track;

    const releaseDate = fullTrack.album?.release_date || null; // "YYYY" or "YYYY-MM-DD"
    const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null;

    const durationMs = fullTrack.duration_ms ?? null;
    let durationFormatted = null;
    if (durationMs != null) {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.round((durationMs % 60000) / 1000);
      durationFormatted = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    const popularity = fullTrack.popularity ?? null;
    const popularityTier = computePopularityTier(popularity);

    const result = {
      trackId: fullTrack.id,
      trackName: fullTrack.name,
      artistName: fullTrack.artists?.map(a => a.name).join(', ') || null,
      albumName: fullTrack.album?.name || null,
      albumImage: fullTrack.album?.images?.[0]?.url || null,
      popularity,
      popularityTier,
      durationMs,
      durationFormatted,
      releaseDate,
      releaseYear,
      explicit: !!fullTrack.explicit,
      marketsCount: Array.isArray(fullTrack.available_markets)
        ? fullTrack.available_markets.length
        : null
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
