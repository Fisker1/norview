import React, { useState, useEffect } from 'react';
import useStore, { REGIONS } from '../store';

export default function StatusBar() {
  const stats = useStore((s) => s.stats);
  const region = useStore((s) => s.region);
  const bounds = useStore((s) => s.bounds);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtUptime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const cfg = REGIONS[region];
  const fmtLat = (v) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? 'N' : 'S'}`;
  const fmtLon = (v) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? 'E' : 'W'}`;

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
      background: 'linear-gradient(0deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.7) 100%)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', zIndex: 100,
      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
      letterSpacing: 1, backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <span>UPTIME {fmtUptime(uptime)}</span>
        <span>REGION {cfg.label}/{cfg.desc.toUpperCase()}</span>
        <span>LAT {fmtLat(bounds.minLat)} — {fmtLat(bounds.maxLat)}</span>
        <span>LON {fmtLon(bounds.minLon)} — {fmtLon(bounds.maxLon)}</span>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <span>DATA FEEDS {stats.lastUpdate ? '● ACTIVE' : '○ CONNECTING'}</span>
        <span>NORVIEW v0.1.0-MVP</span>
      </div>
    </div>
  );
}
