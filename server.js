const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Root route → landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Sample Song Stats endpoint (you'll replace with real Spotify data later)
app.get('/song-stats', async (req, res) => {
  const trackId = req.query.trackId;

  if (!trackId) {
    return res.status(400).json({ error: 'trackId is required' });
  }

  res.json({
    trackId,
    tempo: 120,
    energy: 0.8,
    valence: 0.75,
    danceability: 0.72,
    acousticness: 0.1,
    moodLabel: "Energetic + Happy (sample data)"
  });
});

app.listen(PORT, () => {
  console.log(`Spotify UI server running at http://localhost:${PORT}`);
});
