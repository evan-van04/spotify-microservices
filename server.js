// 8080 server.js  --- main UI + microservices

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

  if (
    energy == null ||
    danceability == null ||
    valence == null ||
    acousticness == null
  ) {
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

// Helper: format ms -> "H hr M min" or "M:SS"
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

// Simple mapping from market code to display label
const COUNTRY_LABELS = {
  GLOBAL: 'Global',

  AD: 'Andorra',
  AE: 'United Arab Emirates',
  AG: 'Antigua and Barbuda',
  AL: 'Albania',
  AM: 'Armenia',
  AO: 'Angola',
  AR: 'Argentina',
  AT: 'Austria',
  AU: 'Australia',
  AZ: 'Azerbaijan',

  BA: 'Bosnia and Herzegovina',
  BB: 'Barbados',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BF: 'Burkina Faso',
  BG: 'Bulgaria',
  BH: 'Bahrain',
  BI: 'Burundi',
  BJ: 'Benin',
  BN: 'Brunei Darussalam',
  BO: 'Bolivia',
  BR: 'Brazil',
  BS: 'Bahamas',
  BT: 'Bhutan',
  BW: 'Botswana',
  BY: 'Belarus',
  BZ: 'Belize',

  CA: 'Canada',
  CD: 'Congo - Kinshasa',
  CG: 'Congo - Brazzaville',
  CH: 'Switzerland',
  CI: "Côte d’Ivoire",
  CL: 'Chile',
  CM: 'Cameroon',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CV: 'Cabo Verde',
  CW: 'Curaçao',
  CY: 'Cyprus',
  CZ: 'Czech Republic',

  DE: 'Germany',
  DJ: 'Djibouti',
  DK: 'Denmark',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  DZ: 'Algeria',

  EC: 'Ecuador',
  EE: 'Estonia',
  EG: 'Egypt',
  ES: 'Spain',
  ET: 'Ethiopia',

  FI: 'Finland',
  FJ: 'Fiji',
  FM: 'Micronesia',

  FR: 'France',
  GA: 'Gabon',
  GB: 'United Kingdom',
  GD: 'Grenada',
  GE: 'Georgia',
  GH: 'Ghana',
  GM: 'Gambia',
  GN: 'Guinea',
  GQ: 'Equatorial Guinea',
  GR: 'Greece',
  GT: 'Guatemala',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',

  HK: 'Hong Kong',
  HN: 'Honduras',
  HR: 'Croatia',
  HT: 'Haiti',
  HU: 'Hungary',

  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IN: 'India',
  IQ: 'Iraq',
  IS: 'Iceland',
  IT: 'Italy',

  JM: 'Jamaica',
  JO: 'Jordan',
  JP: 'Japan',

  KE: 'Kenya',
  KG: 'Kyrgyzstan',
  KH: 'Cambodia',
  KI: 'Kiribati',
  KM: 'Comoros',
  KN: 'Saint Kitts and Nevis',
  KR: 'South Korea',
  KW: 'Kuwait',
  KZ: 'Kazakhstan',

  LA: "Lao People's Democratic Republic",
  LB: 'Lebanon',
  LC: 'Saint Lucia',
  LI: 'Liechtenstein',
  LK: 'Sri Lanka',
  LR: 'Liberia',
  LS: 'Lesotho',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  LY: 'Libya',

  MA: 'Morocco',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MG: 'Madagascar',
  MH: 'Marshall Islands',
  MK: 'North Macedonia',
  ML: 'Mali',
  MN: 'Mongolia',
  MO: 'Macao',
  MR: 'Mauritania',
  MT: 'Malta',
  MU: 'Mauritius',
  MV: 'Maldives',
  MW: 'Malawi',
  MX: 'Mexico',
  MY: 'Malaysia',
  MZ: 'Mozambique',

  NA: 'Namibia',
  NE: 'Niger',
  NG: 'Nigeria',
  NI: 'Nicaragua',
  NL: 'Netherlands',
  NO: 'Norway',
  NP: 'Nepal',
  NR: 'Nauru',
  NZ: 'New Zealand',

  OM: 'Oman',

  PA: 'Panama',
  PE: 'Peru',
  PG: 'Papua New Guinea',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PS: 'Palestine',
  PT: 'Portugal',
  PW: 'Palau',
  PY: 'Paraguay',

  QA: 'Qatar',

  RO: 'Romania',
  RS: 'Serbia',
  RW: 'Rwanda',

  SA: 'Saudi Arabia',
  SB: 'Solomon Islands',
  SC: 'Seychelles',
  SE: 'Sweden',
  SG: 'Singapore',
  SI: 'Slovenia',
  SK: 'Slovakia',
  SL: 'Sierra Leone',
  SM: 'San Marino',
  SN: 'Senegal',
  SR: 'Suriname',
  ST: 'São Tomé and Príncipe',
  SV: 'El Salvador',
  SZ: 'Eswatini',

  TD: 'Chad',
  TG: 'Togo',
  TH: 'Thailand',
  TJ: 'Tajikistan',
  TL: 'Timor-Leste',
  TN: 'Tunisia',
  TO: 'Tonga',
  TR: 'Türkiye',
  TT: 'Trinidad and Tobago',
  TV: 'Tuvalu',
  TZ: 'Tanzania',

  UA: 'Ukraine',
  UG: 'Uganda',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',

  VC: 'Saint Vincent and the Grenadines',
  VE: 'Venezuela',
  VN: 'Vietnam',
  VU: 'Vanuatu',

  WS: 'Samoa',

  XK: 'Kosovo',

  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe'
};

// =====================
// API: Song Stats
// =====================
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
    const searchUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/search` +
      `?q=${encodeURIComponent(query)}` +
      `&limit=1`;

    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Song Stats: search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Failed to search track' });
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
      artistName:
        fullTrack.artists?.map((a) => a.name).join(', ') || null,
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

// =====================
// API: Album Analyzer
// =====================
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
    const searchUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/search-albums` +
      `?q=${encodeURIComponent(query)}`;

    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Album Analyzer: album search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Failed to search album' });
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
      return res
        .status(albumRes.status)
        .json({ error: 'Failed to fetch album details' });
    }

    const albumFull = await albumRes.json();

    const albumName = albumFull.name || album.name || null;
    const artists =
      albumFull.artists?.map((a) => a.name).join(', ') ||
      album.artists?.map((a) => a.name).join(', ') ||
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
      .filter((t) => t && t.id)
      .map(async (t) => {
        const trackId = t.id;
        const trackUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/tracks/${trackId}`;
        const trackRes = await fetch(trackUrl);

        if (!trackRes.ok) {
          const text = await trackRes.text();
          console.error(
            `Album Analyzer: track details error for ${trackId}:`,
            text
          );
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
        full.artists?.map((a) => a.name).join(', ') ||
        simplified.artists?.map((a) => a.name).join(', ') ||
        'Unknown';
      const popularity = full.popularity ?? null;

      const durationMs =
        full.duration_ms ?? simplified.duration_ms ?? null;
      const durationFormatted =
        durationMs != null ? formatDurationMs(durationMs) : null;

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
      popularityValues.length > 0
        ? popularitySum / popularityValues.length
        : null;

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

// ===============================
// Helper for Song Similarity
// ===============================
function computeSimilarityScore(seed, candidate, flags) {
  let score = 0;

  const {
    isSameArtist = false,
    isFromRelatedArtist = false,
    yearDiff,
    popularityDiff,
    durationDiffSec,
    explicitMismatch
  } = flags;

  if (isSameArtist) score += 3;
  else if (isFromRelatedArtist) score += 2;

  if (yearDiff != null) {
    if (yearDiff <= 1) score += 1.5;
    else if (yearDiff <= 3) score += 1.0;
  }

  if (popularityDiff != null) {
    score -= popularityDiff * 0.03; // up to ~3 points penalty for huge diff
  }

  if (durationDiffSec != null) {
    const durationPenalty = Math.min((durationDiffSec / 15) * 0.5, 3);
    score -= durationPenalty;
  }

  if (explicitMismatch) {
    score -= 0.5;
  }

  return score;
}

// =====================
// API: Song Similarity
// =====================
// GET /api/song-similarity?q=<song name or query>
app.get('/api/song-similarity', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        error: 'Missing q query parameter (song name or query)'
      });
    }

    // 1) Resolve seed track
    const searchUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/search` +
      `?q=${encodeURIComponent(query)}` +
      `&limit=1`;

    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Song Similarity: search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Failed to search track' });
    }

    const searchData = await searchRes.json();
    const items = searchData?.tracks?.items || [];

    if (items.length === 0) {
      return res.status(404).json({ error: 'No track found for that query' });
    }

    const seedTrack = items[0];
    const seedArtist = seedTrack.artists?.[0] || null;
    const seedArtistId = seedArtist?.id;

    if (!seedArtistId) {
      return res.status(400).json({
        error:
          'Seed track has no primary artist; cannot compute similarity.'
      });
    }

    const seedReleaseDate = seedTrack.album?.release_date || null;
    const seedReleaseYear = seedReleaseDate
      ? parseInt(seedReleaseDate.slice(0, 4), 10)
      : null;
    const seedDurationMs = seedTrack.duration_ms ?? null;
    const seedPopularity = seedTrack.popularity ?? null;
    const seedExplicit = !!seedTrack.explicit;

    const baseSeed = {
      trackId: seedTrack.id,
      trackName: seedTrack.name,
      artistName:
        seedTrack.artists?.map((a) => a.name).join(', ') || null,
      albumName: seedTrack.album?.name || null,
      albumImage: seedTrack.album?.images?.[0]?.url || null,
      popularity: seedPopularity,
      durationMs: seedDurationMs,
      durationFormatted: formatDurationMs(seedDurationMs),
      releaseYear: seedReleaseYear,
      explicit: seedExplicit
    };

    // 2) Fetch same-artist top tracks + related artists
    const topTracksUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/artists/${seedArtistId}/top-tracks?market=US`;
    const relatedArtistsUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/artists/${seedArtistId}/related-artists`;

    const [topRes, relatedRes] = await Promise.all([
      fetch(topTracksUrl),
      fetch(relatedArtistsUrl)
    ]);

    if (!topRes.ok) {
      const text = await topRes.text();
      console.error('Song Similarity: artist top tracks error:', text);
    }

    if (!relatedRes.ok) {
      const text = await relatedRes.text();
      console.error('Song Similarity: related artists error:', text);
    }

    const topData = topRes.ok ? await topRes.json() : { tracks: [] };
    const relatedData = relatedRes.ok ? await relatedRes.json() : { artists: [] };

    const sameArtistTracks = topData.tracks || [];
    const relatedArtists = relatedData.artists || [];

    // For related artists, fetch top tracks for top 3 related artists (if any)
    const relatedTopPromises = relatedArtists.slice(0, 3).map(async (artist) => {
      if (!artist.id) return null;
      const url =
        `${SPOTIFY_AUTH_BASE_URL}/spotify/artists/${artist.id}/top-tracks?market=US`;
      const r = await fetch(url);
      if (!r.ok) {
        const txt = await r.text();
        console.error(
          `Song Similarity: related artist top-tracks error for ${artist.id}:`,
          txt
        );
        return null;
      }
      const data = await r.json();
      return { artist, tracks: data.tracks || [] };
    });

    const relatedTopResults = await Promise.all(relatedTopPromises);

    // 3) Build candidate pool
    const candidatesMap = new Map();

    // Helper to add candidate
    function addCandidate(track, opts) {
      if (!track || !track.id) return;
      if (track.id === seedTrack.id) return; // don't recommend exact same track
      if (candidatesMap.has(track.id)) return;

      const releaseDate = track.album?.release_date || null;
      const releaseYear = releaseDate
        ? parseInt(releaseDate.slice(0, 4), 10)
        : null;
      const durationMs = track.duration_ms ?? null;
      const popularity = track.popularity ?? null;
      const explicit = !!track.explicit;

      candidatesMap.set(track.id, {
        track,
        meta: {
          releaseYear,
          durationMs,
          popularity,
          explicit,
          isSameArtist: !!opts.isSameArtist,
          isFromRelatedArtist: !!opts.isFromRelatedArtist,
          sourceArtistName: opts.sourceArtistName || null
        }
      });
    }

    // Same-artist top tracks
    for (const t of sameArtistTracks) {
      addCandidate(t, {
        isSameArtist: true,
        isFromRelatedArtist: false,
        sourceArtistName: seedArtist?.name || null
      });
    }

    // Related-artist top tracks
    for (const block of relatedTopResults) {
      if (!block) continue;
      const artist = block.artist;
      const tracks = block.tracks || [];
      for (const t of tracks) {
        addCandidate(t, {
          isSameArtist: false,
          isFromRelatedArtist: true,
          sourceArtistName: artist?.name || null
        });
      }
    }

    const seed = {
      popularity: seedPopularity,
      durationMs: seedDurationMs,
      releaseYear: seedReleaseYear,
      explicit: seedExplicit
    };

    // 4) Score candidates & pick top 5
    const scored = [];

    for (const [id, entry] of candidatesMap.entries()) {
      const { track, meta } = entry;

      const popularityDiff =
        seed.popularity != null && meta.popularity != null
          ? Math.abs(seed.popularity - meta.popularity)
          : null;

      const durationDiffSec =
        seed.durationMs != null && meta.durationMs != null
          ? Math.abs(seed.durationMs - meta.durationMs) / 1000
          : null;

      const yearDiff =
        seed.releaseYear != null && meta.releaseYear != null
          ? Math.abs(seed.releaseYear - meta.releaseYear)
          : null;

      const explicitMismatch =
        seed.explicit != null && meta.explicit != null
          ? seed.explicit !== meta.explicit
          : false;

      const score = computeSimilarityScore(seed, meta, {
        isSameArtist: meta.isSameArtist,
        isFromRelatedArtist: meta.isFromRelatedArtist,
        yearDiff,
        popularityDiff,
        durationDiffSec,
        explicitMismatch
      });

      // Build a short "reason" summary
      const reasons = [];
      if (meta.isSameArtist) reasons.push('same artist');
      else if (meta.isFromRelatedArtist) reasons.push('related artist');

      if (yearDiff != null && yearDiff <= 2) reasons.push('similar era');
      if (popularityDiff != null && popularityDiff <= 10)
        reasons.push('similar popularity');
      if (durationDiffSec != null && durationDiffSec <= 20)
        reasons.push('similar length');

      const reasonSummary = reasons.length
        ? reasons.join(' · ')
        : 'similar by track metadata';

      scored.push({
        id,
        track,
        meta,
        score,
        reasonSummary
      });
    }

    scored.sort((a, b) => b.score - a.score);

    const topN = scored.slice(0, 5);

    const recommendations = topN.map((entry, idx) => {
      const t = entry.track;
      const m = entry.meta;

      const releaseYear = m.releaseYear;
      const durationFormatted = formatDurationMs(m.durationMs);

      return {
        rank: idx + 1,
        trackId: t.id,
        trackName: t.name,
        artistName:
          t.artists?.map((a) => a.name).join(', ') || 'Unknown artist',
        albumName: t.album?.name || 'Unknown album',
        albumImage: t.album?.images?.[0]?.url || null,
        popularity: m.popularity,
        durationFormatted,
        releaseYear,
        reasonSummary: entry.reasonSummary
      };
    });

    const result = {
      seedTrack: baseSeed,
      recommendations
    };

    res.json(result);
  } catch (err) {
    console.error('Song Similarity endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// API: Trend Analytics
// =====================
// GET /api/trend-analytics?country=<marketCode>
// Example: /api/trend-analytics?country=CA
app.get('/api/trend-analytics', async (req, res) => {
  try {
    let code = (req.query.country || '').trim().toUpperCase();
    if (!code) {
      code = 'GLOBAL';
    }

    // Map to display label
    const displayCountry = COUNTRY_LABELS[code] || code;

    // Spotify market code to use
    const market = code === 'GLOBAL' ? 'US' : code;

    // Query string: tracks released from 2020 to 2025 (ish)
    const q = 'year:2020-2025';

    const searchUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/search` +
      `?q=${encodeURIComponent(q)}` +
      `&limit=50` +
      `&market=${encodeURIComponent(market)}`;

    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Trend Analytics: search error', searchRes.status, text);
      return res
        .status(searchRes.status)
        .json({ error: 'Failed to fetch tracks from Spotify' });
    }

    const data = await searchRes.json();
    const items = data?.tracks?.items || [];

    if (items.length === 0) {
      return res.status(404).json({
        error: 'No tracks found for this market / time window.'
      });
    }

    // Sort by popularity descending and take top 10
    const sorted = [...items].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0)
    );
    const top10 = sorted.slice(0, 10);

    const topTracks = top10.map((track, idx) => {
      const releaseDate = track.album?.release_date || '';
      const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null;
      const durationMs = track.duration_ms ?? null;
      const durationFormatted =
        durationMs != null ? formatDurationMs(durationMs) : null;

      return {
        rank: idx + 1,
        trackName: track.name || 'Unknown track',
        artistName:
          track.artists?.map((a) => a.name).join(', ') || 'Unknown artist',
        popularity: track.popularity ?? null,
        releaseYear,
        durationFormatted
      };
    });

    // Summary stats
    const popularityValues = topTracks
      .map((t) => t.popularity)
      .filter((p) => p != null);

    const avgPopularity =
      popularityValues.length > 0
        ? popularityValues.reduce((sum, p) => sum + p, 0) /
          popularityValues.length
        : null;

    const yearValues = topTracks
      .map((t) => parseInt(t.releaseYear, 10))
      .filter((y) => !Number.isNaN(y));

    const avgReleaseYear =
      yearValues.length > 0
        ? Math.round(
            yearValues.reduce((sum, y) => sum + y, 0) / yearValues.length
          )
        : null;

    res.json({
      displayCountry,
      market,
      window: '2020-2025',
      avgPopularity,
      avgReleaseYear,
      topTracks
    });
  } catch (err) {
    console.error('Trend Analytics endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================
// API: Artist Stats
// =====================
// GET /api/artist-stats?q=<artist name or query>
app.get('/api/artist-stats', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        error: 'Missing q query parameter (artist name or query)'
      });
    }

    // 1) Search for the artist via spotify-auth
    const searchUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/search-artists` +
      `?q=${encodeURIComponent(query)}` +
      `&limit=1`;

    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error('Artist Stats: artist search error:', text);
      return res
        .status(searchRes.status)
        .json({ error: 'Failed to search artist' });
    }

    const searchData = await searchRes.json();
    const artists = searchData?.artists?.items || [];
    if (artists.length === 0) {
      return res.status(404).json({ error: 'No artist found for that query' });
    }

    const artist = artists[0];
    const artistId = artist.id;

    // 2) Fetch full artist details
    const artistUrl = `${SPOTIFY_AUTH_BASE_URL}/spotify/artists/${artistId}`;
    const artistRes = await fetch(artistUrl);

    if (!artistRes.ok) {
      const text = await artistRes.text();
      console.error('Artist Stats: artist details error:', text);
      return res
        .status(artistRes.status)
        .json({ error: 'Failed to fetch artist details' });
    }

    const artistFull = await artistRes.json();

    // 3) Fetch albums (albums + singles) to get a count
    const albumsUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/artists/${artistId}/albums` +
      `?include_groups=album,single&limit=50`;
    const albumsRes = await fetch(albumsUrl);

    let albumCount = null;
    if (albumsRes.ok) {
      const albumsData = await albumsRes.json();
      if (typeof albumsData.total === 'number') {
        albumCount = albumsData.total;
      } else if (Array.isArray(albumsData.items)) {
        albumCount = albumsData.items.length;
      }
    } else {
      const text = await albumsRes.text();
      console.error('Artist Stats: artist albums error:', text);
    }

    // 4) Fetch top tracks (sample)
    const topTracksUrl =
      `${SPOTIFY_AUTH_BASE_URL}/spotify/artists/${artistId}/top-tracks?market=US`;
    const topRes = await fetch(topTracksUrl);

    let topTracks = [];
    if (topRes.ok) {
      const topData = await topRes.json();
      const tracks = topData.tracks || [];
      topTracks = tracks.slice(0, 5).map((t) => {
        const durationMs = t.duration_ms ?? null;
        return {
          name: t.name || 'Unknown track',
          albumName: t.album?.name || null,
          popularity: t.popularity ?? null,
          durationMs,
          durationFormatted: formatDurationMs(durationMs)
        };
      });
    } else {
      const text = await topRes.text();
      console.error('Artist Stats: top-tracks error:', text);
    }

    // Pick largest image if available
    let image = null;
    if (Array.isArray(artistFull.images) && artistFull.images.length > 0) {
      image = artistFull.images[0].url;
    }

    const followers = artistFull.followers?.total ?? null;
    const popularity = artistFull.popularity ?? null;
    const popularityTier = computePopularityTier(popularity);
    const genres = artistFull.genres || [];

    const result = {
      artistId,
      name: artistFull.name || artist.name || 'Unknown artist',
      image,
      followers,
      popularity,
      popularityTier,
      genres,
      albumCount,
      topTracks
    };

    res.json(result);
  } catch (err) {
    console.error('Artist Stats endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(
    `Spotify UI, Song Stats, Album Analyzer, Song Similarity, Trend Analytics & Artist Stats running at http://localhost:${PORT}`
  );
});
