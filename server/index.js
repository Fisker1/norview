import express from 'express';
import cors from 'cors';

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
║    NORVIEW API Server — Port ${PORT}        ║
║    Arctic OSINT Command Center           ║
╚══════════════════════════════════════════╝
  `);
});
