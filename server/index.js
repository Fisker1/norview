import express from 'express';
import cors from 'cors';
import { startRecording, queryHistory, getTimestamps } from './recorder.js';

const app = express();
const PORT = 3001;

app.use(cors());

// Cache with TTL
const cache = new Map();
function cached(key, ttlMs, fetcher) {
  return async (req, res) => {
    const cacheKey = key + JSON.stringify(req.query);
    const entry = cache.get(cacheKey);
    if (entry && Date.now() - entry.ts < ttlMs) {
      return res.json(entry.data);
    }
    try {
      const data = await fetcher(req);
      cache.set(cacheKey, { data, ts: Date.now() });
      res.json(data);
    } catch (err) {
      console.error(`[${key}] Error:`, err.message);
      res.status(502).json({ error: err.message });
    }
  };
}

// OpenSky Network — real live flight data (free, no auth required)
app.get('/api/flights', cached('flights', 10000, async (req) => {
  const { lamin, lamax, lomin, lomax } = req.query;
  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  console.log(`[FLIGHTS] Fetching: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OpenSky returned ${resp.status}`);
  return await resp.json();
}));

// CelesTrak satellite TLE data — full active catalog
app.get('/api/satellites/active', cached('satellites-active', 3600000, async () => {
  const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';
  console.log('[SATELLITES] Fetching active catalog...');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`CelesTrak returned ${resp.status}`);
  return await resp.json();
}));

// CelesTrak — space stations + visible sats (smaller, reliable set)
app.get('/api/satellites/stations', cached('satellites-stations', 3600000, async () => {
  const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json';
  console.log('[SATELLITES] Fetching space stations TLE data...');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`CelesTrak stations returned ${resp.status}`);
  return await resp.json();
}));

// CelesTrak — military satellites
app.get('/api/satellites/military', cached('satellites-military', 3600000, async () => {
  const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=json';
  console.log('[SATELLITES] Fetching military satellite TLE data...');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`CelesTrak military returned ${resp.status}`);
  return await resp.json();
}));

// CelesTrak — weather satellites
app.get('/api/satellites/weather', cached('satellites-weather', 3600000, async () => {
  const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json';
  console.log('[SATELLITES] Fetching weather satellite TLE data...');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`CelesTrak weather returned ${resp.status}`);
  return await resp.json();
}));

// Open-Meteo Weather API — real-time weather intelligence (free, no auth)
// Maven + GODS EYE feature: environmental data fusion for operational awareness
app.get('/api/weather', cached('weather', 300000, async (req) => {
  const { latitudes, longitudes } = req.query;
  if (!latitudes || !longitudes) throw new Error('Required: latitudes, longitudes (comma-separated)');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms`;
  console.log('[WEATHER] Fetching:', url);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo returned ${resp.status}`);
  const raw = await resp.json();
  // Normalize: Open-Meteo returns array for multi-location or single object
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((r) => ({
    temperature: r.current?.temperature_2m,
    humidity: r.current?.relative_humidity_2m,
    precipitation: r.current?.precipitation,
    cloudCover: r.current?.cloud_cover,
    visibility: r.current?.visibility,
    windSpeed: r.current?.wind_speed_10m,
    windDirection: r.current?.wind_direction_10m,
    windGusts: r.current?.wind_gusts_10m,
  }));
}));

// ---- History API endpoints ----

// Get historical snapshots for a data type
app.get('/api/history', (req, res) => {
  const { type, from, to } = req.query;
  if (!type || !from || !to) {
    return res.status(400).json({ error: 'Required: type, from, to (ISO timestamps)' });
  }
  try {
    const data = queryHistory(type, from, to);
    res.json(data);
  } catch (err) {
    console.error('[HISTORY] Query error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get available snapshot timestamps
app.get('/api/history/timestamps', (req, res) => {
  try {
    const timestamps = getTimestamps();
    res.json({ timestamps, count: timestamps.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    cache_entries: cache.size,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   NORVIEW API Server — Port ${PORT}       ║
║   Arctic OSINT Command Center            ║
╚══════════════════════════════════════════╝
`);

  // Start recording snapshots for timeline history
  startRecording(
    // Fetch flights (Norway region)
    async () => {
      const url = 'https://opensky-network.org/api/states/all?lamin=57.5&lomin=-5&lamax=81&lomax=40';
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return await resp.json();
    },
    // Fetch military satellites
    async () => {
      const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=json';
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return await resp.json();
    }
  );
});
