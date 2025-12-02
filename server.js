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

// Helper: compute a simple mood label from audio features (currently unused here)
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

// Helper to format ms -> "H hr M min" or "M:SS"
function formatDurationMs(msTotal) {
  if (msTotal == null) return null;
  const totalSeconds = Math.round(msTotal / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// API: Album Analyzer – keyword-based album search, ranks tracks by popularity
// GET /api/album-analyzer?q=<album name or query>
app.get('/api/album-analyzer', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        error: 'Missing q query parameter (album name or query)'
      });
    }

    // 1) Search for the album via spotify-auth (type=album)
    const searchUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/search-albums?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Album Analyzer: album search error:', text);
      return res.status(searchRes.status).json({ error: 'Failed to search album' });
    }

    const searchData = await searchRes.json();
    const albums = searchData?.albums?.items || [];
    if (albums.length === 0) {
      return res.status(404).json({ error: 'No album found for that query' });
    }

    const album = albums[0]; // best match
    const albumId = album.id;

    // 2) Fetch album details (with simplified tracks)
    const albumUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/albums/${albumId}`;
    const albumRes = await fetch(albumUrl);

    if (!albumRes.ok) {
      const text = await albumRes.text();
      console.error('Album Analyzer: album details error:', text);
      return res.status(albumRes.status).json({ error: 'Failed to fetch album details' });
    }

    const albumFull = await albumRes.json();

    const albumName = albumFull.name || album.name || null;
    const artists =
      albumFull.artists?.map(a => a.name).join(', ') ||
      album.artists?.map(a => a.name).join(', ') ||
      null;
    const releaseDate = albumFull.release_date || album.release_date || null;
    const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null;
    const albumImage =
      albumFull.images?.[0]?.url || album.images?.[0]?.url || null;

    const tracks = albumFull.tracks?.items || [];
    const trackRows = [];

    let totalDurationMs = 0;
    let popularitySum = 0;
    const popularityValues = [];

    // 3) For each track, fetch full track details to get popularity
    const fullTrackPromises = tracks
      .filter(t => t && t.id)
      .map(async (t) => {
        const trackId = t.id;
        const trackUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/tracks/${trackId}`;
        const trackRes = await fetch(trackUrl);

        if (!trackRes.ok) {
          const text = await trackRes.text();
          console.error(`Album Analyzer: track details error for ${trackId}:`, text);
          return null;
        }

        const fullTrack = await trackRes.json();
        return { simplified: t, full: fullTrack };
      });

    const fullTracks = await Promise.all(fullTrackPromises);

    for (const pair of fullTracks) {
      if (!pair) continue;
      const { simplified, full } = pair;

      const name = full.name || simplified.name || 'Unknown track';
      const artistName =
        full.artists?.map(a => a.name).join(', ') ||
        simplified.artists?.map(a => a.name).join(', ') ||
        'Unknown';
      const popularity = full.popularity ?? null;

      const durationMs = full.duration_ms ?? simplified.duration_ms ?? null;
      const durationFormatted = durationMs != null ? formatDurationMs(durationMs) : null;

      const discNumber = full.disc_number ?? simplified.disc_number ?? null;
      const trackNumber = full.track_number ?? simplified.track_number ?? null;

      if (durationMs != null) totalDurationMs += durationMs;
      if (popularity != null) {
        popularitySum += popularity;
        popularityValues.push(popularity);
      }

      trackRows.push({
        name,
        artistName,
        popularity,
        durationMs,
        durationFormatted,
        discNumber,
        trackNumber
      });
    }

    const totalTracks = trackRows.length;
    const avgPopularity =
      popularityValues.length > 0 ? popularitySum / popularityValues.length : null;

    let medianPopularity = null;
    if (popularityValues.length > 0) {
      const sorted = [...popularityValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianPopularity =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
    }

    // Rank tracks by popularity descending
    trackRows.sort((a, b) => {
      const pa = a.popularity ?? -1;
      const pb = b.popularity ?? -1;
      return pb - pa;
    });

    let topTrackName = null;
    let topTrackPopularity = null;
    if (trackRows.length > 0) {
      topTrackName = trackRows[0].name;
      topTrackPopularity = trackRows[0].popularity ?? null;
    }

    const rankedTracks = trackRows.map((t, idx) => ({
      rank: idx + 1,
      ...t
    }));

    const result = {
      albumId,
      albumName,
      artists,
      albumImage,
      label: albumFull.label || null,
      releaseDate,
      releaseYear,
      totalTracks,
      totalDurationMs,
      totalDurationFormatted: formatDurationMs(totalDurationMs),
      avgPopularity,
      medianPopularity,
      topTrackName,
      topTrackPopularity,
      tracks: rankedTracks
    };

    res.json(result);
  } catch (err) {
    console.error('Album Analyzer endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Spotify UI, Song Stats & Album Analyzer service running at http://localhost:${PORT}`);
});
