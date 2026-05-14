import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'norview.db');

// 7 days in milliseconds
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// 5 minutes in milliseconds
const RECORD_INTERVAL_MS = 5 * 60 * 1000;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(timestamp);
  CREATE INDEX IF NOT EXISTS idx_snapshots_type ON snapshots(type);
`);

const insertStmt = db.prepare(
  'INSERT INTO snapshots (timestamp, type, data) VALUES (?, ?, ?)'
);

const queryStmt = db.prepare(
  'SELECT timestamp, type, data FROM snapshots WHERE type = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC'
);

const timestampsStmt = db.prepare(
  'SELECT DISTINCT timestamp FROM snapshots ORDER BY timestamp ASC'
);

const pruneStmt = db.prepare(
  'DELETE FROM snapshots WHERE timestamp < ?'
);

export function record(type, data) {
  const ts = new Date().toISOString();
  const json = JSON.stringify(data);
  insertStmt.run(ts, type, json);
  console.log(`[RECORDER] Saved ${type} snapshot at ${ts} (${json.length} bytes)`);
}

export function queryHistory(type, from, to) {
  const rows = queryStmt.all(type, from, to);
  return rows.map(r => ({
    timestamp: r.timestamp,
    type: r.type,
    data: JSON.parse(r.data),
  }));
}

export function getTimestamps() {
  return timestampsStmt.all().map(r => r.timestamp);
}

export function prune() {
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const result = pruneStmt.run(cutoff);
  if (result.changes > 0) {
    console.log(`[RECORDER] Pruned ${result.changes} old snapshots (before ${cutoff})`);
  }
}

// Auto-prune on startup
prune();

export async function startRecording(fetchFlights, fetchSatellites) {
  console.log(`[RECORDER] Recording every ${RECORD_INTERVAL_MS / 1000}s, keeping ${MAX_AGE_MS / 86400000} days`);

  async function snapshot() {
    try {
      // Record flights (Norway region as default)
      const flightData = await fetchFlights();
      if (flightData) record('flights', flightData);
    } catch (e) {
      console.error('[RECORDER] Flight snapshot failed:', e.message);
    }

    try {
      // Record satellites
      const satData = await fetchSatellites();
      if (satData) record('satellites', satData);
    } catch (e) {
      console.error('[RECORDER] Satellite snapshot failed:', e.message);
    }

    // Prune old data
    prune();
  }

  // First snapshot immediately
  await snapshot();

  // Then every 5 minutes
  setInterval(snapshot, RECORD_INTERVAL_MS);
}
