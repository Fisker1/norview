import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store';

const MAX_HISTORY_DAYS = 7;
const LIVE_POLL_MS = 30000; // poll timestamps every 30s

export default function Timeline() {
  const setFlights = useStore((s) => s.setFlights);
  const setSatellites = useStore((s) => s.setSatellites);
  const [isLive, setIsLive] = useState(true);
  const [timestamps, setTimestamps] = useState([]);
  const [scrubPos, setScrubPos] = useState(1); // 0-1, 1 = now
  const [scrubTime, setScrubTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const fetchAbortRef = useRef(null);

  // Range
  const now = Date.now();
  const rangeStart = now - MAX_HISTORY_DAYS * 24 * 3600 * 1000;

  // Fetch available timestamps on mount and periodically
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/history/timestamps');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setTimestamps(data);
          setSnapshotCount(data.length);
        }
      } catch (e) { /* ignore */ }
    };
    load();
    const t = setInterval(load, LIVE_POLL_MS);
    return () => clearInterval(t);
  }, []);

  // Fetch historical snapshot for a given time
  const fetchSnapshot = useCallback(async (time) => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    setLoading(true);
    try {
      // Find nearest timestamp within 5 min window
      const from = time - 5 * 60 * 1000;
      const to = time + 5 * 60 * 1000;
      const [flightsRes, satsRes] = await Promise.all([
        fetch(`/api/history?type=flights&from=${from}&to=${to}`, { signal: ctrl.signal }),
        fetch(`/api/history?type=satellites&from=${from}&to=${to}`, { signal: ctrl.signal }),
      ]);
      if (flightsRes.ok) {
        const fd = await flightsRes.json();
        if (fd.length > 0) {
          const parsed = JSON.parse(fd[fd.length - 1].data);
          setFlights(parsed);
        }
      }
      if (satsRes.ok) {
        const sd = await satsRes.json();
        if (sd.length > 0) {
          const parsed = JSON.parse(sd[sd.length - 1].data);
          setSatellites(parsed);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [setFlights, setSatellites]);

  // Go live: refetch current data
  const goLive = useCallback(async () => {
    setIsLive(true);
    setScrubPos(1);
    setScrubTime(null);
    try {
      const [fr, sr] = await Promise.all([
        fetch('/api/flights'),
        fetch('/api/satellites/positions'),
      ]);
      if (fr.ok) setFlights(await fr.json());
      if (sr.ok) setSatellites(await sr.json());
    } catch (e) { /* ignore */ }
  }, [setFlights, setSatellites]);

  // Scrub interaction
  const posToTime = (pos) => rangeStart + pos * (now - rangeStart);

  const handleScrub = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setScrubPos(x);
    const time = posToTime(x);
    setScrubTime(new Date(time));
    if (x < 0.995) {
      setIsLive(false);
      fetchSnapshot(time);
    } else {
      goLive();
    }
  }, [fetchSnapshot, goLive]);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    handleScrub(e.clientX);
    const onMove = (ev) => { if (draggingRef.current) handleScrub(ev.clientX); };
    const onUp = () => { draggingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleScrub]);

  // Time markers
  const markers = [];
  const markerCount = 7; // one per day
  for (let i = 0; i <= markerCount; i++) {
    const pos = i / markerCount;
    const t = new Date(posToTime(pos));
    const label = i === markerCount
      ? 'NOW'
      : t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    markers.push({ pos, label });
  }

  // Snapshot density visualization
  const bucketCount = 50;
  const buckets = new Array(bucketCount).fill(0);
  timestamps.forEach((ts) => {
    const pos = (ts - rangeStart) / (now - rangeStart);
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor(pos * bucketCount)));
    buckets[idx]++;
  });
  const maxBucket = Math.max(1, ...buckets);

  const displayTime = scrubTime
    ? scrubTime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
      padding: '8px 16px 12px',
      zIndex: 1000,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            TIMELINE
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: loading ? 'var(--accent-amber)' : 'var(--text-dim)',
          }}>
            {loading ? 'LOADING...' : `${snapshotCount} SNAPSHOTS`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--accent-cyan)',
          }}>
            {displayTime}
          </span>
          <button
            onClick={goLive}
            style={{
              background: isLive ? 'var(--accent-green, #00ff88)' : 'rgba(255,255,255,0.1)',
              color: isLive ? '#000' : 'var(--text-primary)',
              border: 'none', borderRadius: 3, padding: '2px 8px',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 1,
              animation: isLive ? 'none' : undefined,
            }}
          >
            {isLive ? '\u25CF LIVE' : 'GO LIVE'}
          </button>
        </div>
      </div>

      {/* Density bars */}
      <div style={{ display: 'flex', height: 16, gap: 1, marginBottom: 2, alignItems: 'flex-end' }}>
        {buckets.map((count, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(2, (count / maxBucket) * 16)}px`,
              background: count > 0
                ? `rgba(0, 255, 136, ${0.15 + (count / maxBucket) * 0.5})`
                : 'rgba(255,255,255,0.03)',
              borderRadius: 1,
            }}
          />
        ))}
      </div>

      {/* Scrubber track */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{
          position: 'relative', height: 12, cursor: 'pointer',
          background: 'rgba(255,255,255,0.03)', borderRadius: 6,
        }}
      >
        {/* Progress fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${scrubPos * 100}%`,
          background: isLive
            ? 'linear-gradient(90deg, rgba(0,255,136,0.1), rgba(0,255,136,0.3))'
            : 'linear-gradient(90deg, rgba(0,170,255,0.1), rgba(0,170,255,0.3))',
          borderRadius: 6,
        }} />
        {/* Scrub handle */}
        <div style={{
          position: 'absolute', top: -2, width: 4, height: 16,
          left: `calc(${scrubPos * 100}% - 2px)`,
          background: isLive ? 'var(--accent-green, #00ff88)' : 'var(--accent-cyan, #00aaff)',
          borderRadius: 2,
          boxShadow: `0 0 8px ${isLive ? 'rgba(0,255,136,0.5)' : 'rgba(0,170,255,0.5)'}`,
        }} />
      </div>

      {/* Time markers */}
      <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
        {markers.map((m, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${m.pos * 100}%`,
              transform: 'translateX(-50%)',
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: m.label === 'NOW' ? 'var(--accent-green, #00ff88)' : 'var(--text-dim)',
              fontWeight: m.label === 'NOW' ? 700 : 400,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
