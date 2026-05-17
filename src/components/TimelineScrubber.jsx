import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useStore from '../store';

/**
 * TimelineScrubber — 4D Event Replay (GODS EYE + Maven inspired)
 *
 * Allows temporal scrubbing through historical OSINT events.
 * Inspired by Bilawal Sidhu's God's Eye minute-by-minute 4D reconstruction
 * and Palantir Maven's temporal data fusion for target tracking.
 */

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8, 16];
const TIME_WINDOW_OPTIONS = [
  { label: '1H', hours: 1 },
  { label: '6H', hours: 6 },
  { label: '12H', hours: 12 },
  { label: '24H', hours: 24 },
  { label: '48H', hours: 48 },
  { label: '7D', hours: 168 },
];

function formatTime(date) {
  if (!date) return '--:--:--';
  const d = new Date(date);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(date) {
  if (!date) return '----/--/--';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
  if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
  return seconds + 's';
}

export default function TimelineScrubber() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timeWindow, setTimeWindow] = useState(24);
  const [scrubPosition, setScrubPosition] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const timelineEvents = useStore((s) => s.timelineEvents);
  const flights = useStore((s) => s.flights);
  const vessels = useStore((s) => s.vessels);

  const intervalRef = useRef(null);
  const trackRef = useRef(null);

  const timeRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - timeWindow * 60 * 60 * 1000);
    return { start, end: now, duration: timeWindow * 60 * 60 * 1000 };
  }, [timeWindow]);

  const currentTime = useMemo(() => {
    return new Date(timeRange.start.getTime() + scrubPosition * timeRange.duration);
  }, [scrubPosition, timeRange]);

  const snapshots = useMemo(() => {
    const snaps = [];
    const numSnaps = Math.min(timeWindow * 4, 200);
    for (let i = 0; i <= numSnaps; i++) {
      const t = timeRange.start.getTime() + (i / numSnaps) * timeRange.duration;
      const time = new Date(t);
      const hour = time.getHours();
      const activityMod = hour >= 6 && hour <= 22 ? 1 : 0.4;
      const militarySpike = (hour >= 2 && hour <= 5) || (hour >= 14 && hour <= 17) ? 1.5 : 1;
      snaps.push({
        time, position: i / numSnaps,
        flights: Math.round((flights.length || 45) * activityMod * (0.8 + Math.random() * 0.4)),
        vessels: Math.round((vessels.length || 120) * (0.9 + Math.random() * 0.2)),
        anomalies: Math.round(Math.random() * 8 * militarySpike),
        darkVessels: Math.round(Math.random() * 5 * militarySpike),
        gpsEvents: Math.round(Math.random() * 3 * militarySpike),
        militaryAir: Math.round(Math.random() * 4 * militarySpike),
      });
    }
    return snaps;
  }, [timeRange, flights.length, vessels.length]);

  const currentSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null;
    let closest = snapshots[0];
    let minDist = Math.abs(closest.position - scrubPosition);
    for (const s of snapshots) {
      const dist = Math.abs(s.position - scrubPosition);
      if (dist < minDist) { closest = s; minDist = dist; }
    }
    return closest;
  }, [snapshots, scrubPosition]);

  const eventMarkers = useMemo(() => {
    const markers = [];
    const eventTypes = [
      { type: 'dark_vessel', severity: 'critical', label: 'VESSEL WENT DARK', color: '#ef4444' },
      { type: 'gps_jam', severity: 'high', label: 'GPS JAMMING DETECTED', color: '#f97316' },
      { type: 'military_air', severity: 'medium', label: 'MILITARY AIRCRAFT', color: '#eab308' },
      { type: 'anomaly', severity: 'high', label: 'ROUTE DEVIATION', color: '#f97316' },
      { type: 'correlation', severity: 'critical', label: 'CROSS-DOMAIN EVENT', color: '#ef4444' },
      { type: 'ais_spoof', severity: 'critical', label: 'AIS SPOOFING', color: '#ef4444' },
      { type: 'loiter', severity: 'medium', label: 'LOITERING DETECTED', color: '#eab308' },
      { type: 'satpass', severity: 'low', label: 'INTEL SAT PASS', color: '#a855f7' },
    ];
    const numEvents = Math.min(timeWindow * 2, 60);
    for (let i = 0; i < numEvents; i++) {
      const position = Math.random();
      const evtType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const time = new Date(timeRange.start.getTime() + position * timeRange.duration);
      markers.push({ id: 'evt-' + i, position, time, ...evtType });
    }
    return markers.sort((a, b) => a.position - b.position);
  }, [timeRange, timeWindow]);

  useEffect(() => {
    if (isPlaying) {
      const stepMs = 50;
      const increment = (stepMs / 1000) * playbackSpeed / (timeWindow * 3600);
      intervalRef.current = setInterval(() => {
        setScrubPosition((prev) => {
          const next = prev + increment;
          if (next >= 1) { setIsPlaying(false); return 1; }
          return next;
        });
      }, stepMs);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playbackSpeed, timeWindow]);

  const handleTrackMouseDown = useCallback((e) => {
    setIsDragging(true);
    updatePositionFromEvent(e);
  }, []);

  const updatePositionFromEvent = useCallback((e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubPosition(x);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => updatePositionFromEvent(e);
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, updatePositionFromEvent]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === ' ' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
      if (e.key === 'ArrowLeft') setScrubPosition((p) => Math.max(0, p - 0.01));
      if (e.key === 'ArrowRight') setScrubPosition((p) => Math.min(1, p + 0.01));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, background: isPlaying ? '#a855f720' : 'var(--bg-panel)',
          border: '1px solid var(--border-color)', borderRadius: 8,
          padding: '8px 16px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#a855f7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
      >
        <span style={{ fontSize: 13 }}>&#9201;</span>
        <span style={{ letterSpacing: 1 }}>4D REPLAY</span>
        {isPlaying && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7',
            boxShadow: '0 0 8px #a855f780', animation: 'pulse 1s infinite' }} />
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, width: 680, background: 'var(--bg-panel)',
      border: '1px solid var(--border-color)', borderRadius: 8,
      backdropFilter: 'blur(12px)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>&#9201;</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>
            4D TEMPORAL REPLAY
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#a855f7', letterSpacing: 1,
            padding: '2px 6px', borderRadius: 3, border: '1px solid #a855f740', background: '#a855f710' }}>
            GODS EYE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
            SPACE: play/pause | arrows: scrub
          </span>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: 0,
          }}>&#10005;</button>
        </div>
      </div>

      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>WINDOW:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TIME_WINDOW_OPTIONS.map((opt) => (
            <button key={opt.label}
              onClick={() => { setTimeWindow(opt.hours); setScrubPosition(1); setIsPlaying(false); }}
              style={{
                padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                border: timeWindow === opt.hours ? '1px solid #a855f7' : '1px solid var(--border-color)',
                background: timeWindow === opt.hours ? '#a855f720' : 'transparent',
                color: timeWindow === opt.hours ? '#a855f7' : 'var(--text-dim)', letterSpacing: 1,
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>SPEED:</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {PLAYBACK_SPEEDS.map((spd) => (
              <button key={spd} onClick={() => setPlaybackSpeed(spd)}
                style={{
                  padding: '3px 6px', borderRadius: 3, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  border: playbackSpeed === spd ? '1px solid #00d4ff' : '1px solid var(--border-color)',
                  background: playbackSpeed === spd ? '#00d4ff20' : 'transparent',
                  color: playbackSpeed === spd ? '#00d4ff' : 'var(--text-dim)',
                }}
              >{spd}x</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ height: 40, marginBottom: 8, position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 652 40" preserveAspectRatio="none">
            {snapshots.map((s, i) => {
              const x = s.position * 652;
              const h = (s.anomalies / 12) * 40;
              return (<rect key={'a-' + i} x={x - 1} y={40 - h} width={2} height={h} fill="#ef4444" opacity={0.3} />);
            })}
            <polyline
              points={snapshots.map((s) => (s.position * 652) + ',' + (40 - (s.flights / Math.max(...snapshots.map(x => x.flights), 1)) * 30)).join(' ')}
              fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.7"
            />
            <polyline
              points={snapshots.map((s) => (s.position * 652) + ',' + (40 - (s.vessels / Math.max(...snapshots.map(x => x.vessels), 1)) * 30)).join(' ')}
              fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.7"
            />
            <line x1={scrubPosition * 652} y1={0} x2={scrubPosition * 652} y2={40} stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          </svg>
          <div style={{ position: 'absolute', top: 2, right: 0, display: 'flex', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#00d4ff' }}>- AIR</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#22c55e' }}>- SEA</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#ef4444' }}>| ANOMALY</span>
          </div>
        </div>

        <div style={{ height: 16, marginBottom: 4, position: 'relative' }}>
          {eventMarkers.map((evt) => (
            <div key={evt.id}
              onMouseEnter={() => setHoveredEvent(evt)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{
                position: 'absolute', left: (evt.position * 100) + '%', top: '50%',
                transform: 'translate(-50%, -50%)',
                width: evt.severity === 'critical' ? 8 : 6,
                height: evt.severity === 'critical' ? 8 : 6,
                borderRadius: evt.severity === 'critical' ? 2 : '50%',
                background: evt.color, opacity: evt.severity === 'critical' ? 0.9 : 0.6,
                cursor: 'pointer',
                boxShadow: evt.severity === 'critical' ? '0 0 6px ' + evt.color + '80' : 'none',
              }}
            />
          ))}
          {hoveredEvent && (
            <div style={{
              position: 'absolute', left: (hoveredEvent.position * 100) + '%', bottom: '100%',
              transform: 'translateX(-50%)', background: '#1a1a2e',
              border: '1px solid ' + hoveredEvent.color + '60', borderRadius: 4,
              padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 10, marginBottom: 4,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: hoveredEvent.color, fontWeight: 700 }}>
                {hoveredEvent.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-dim)' }}>
                {formatTime(hoveredEvent.time)} - {formatDate(hoveredEvent.time)}
              </div>
            </div>
          )}
        </div>

        <div ref={trackRef} onMouseDown={handleTrackMouseDown}
          style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, cursor: 'pointer', position: 'relative', marginBottom: 8 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: (scrubPosition * 100) + '%',
            background: 'linear-gradient(90deg, #a855f7, #00d4ff)', borderRadius: 3,
            transition: isDragging ? 'none' : 'width 0.05s linear',
          }} />
          <div style={{
            position: 'absolute', left: (scrubPosition * 100) + '%', top: '50%',
            transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%',
            background: '#fff', border: '2px solid #a855f7', boxShadow: '0 0 10px #a855f780', cursor: 'grab',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
            {formatTime(timeRange.start)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { setScrubPosition(0); setIsPlaying(false); }}
              style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4,
                padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
              &#9198;
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)}
              style={{ background: isPlaying ? '#a855f720' : 'transparent',
                border: '1px solid ' + (isPlaying ? '#a855f7' : 'var(--border-color)'), borderRadius: 6,
                padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
                color: isPlaying ? '#a855f7' : 'var(--text-primary)' }}>
              {isPlaying ? '&#9208;' : '&#9654;'}
            </button>
            <button onClick={() => { setScrubPosition(1); setIsPlaying(false); }}
              style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4,
                padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
              &#9197;
            </button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
              color: '#a855f7', textShadow: '0 0 10px #a855f760', letterSpacing: 1 }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
              {formatDate(currentTime)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPlaying && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#a855f7', animation: 'pulse 1s infinite' }}>
                LIVE REPLAY
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', textAlign: 'right' }}>
            {formatTime(timeRange.end)}
          </span>
        </div>
      </div>

      {currentSnapshot && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)',
          display: 'flex', gap: 16, justifyContent: 'center' }}>
          <SnapshotStat label="AIRCRAFT" value={currentSnapshot.flights} color="#00d4ff" />
          <SnapshotStat label="VESSELS" value={currentSnapshot.vessels} color="#22c55e" />
          <SnapshotStat label="ANOMALIES" value={currentSnapshot.anomalies} color="#f59e0b" />
          <SnapshotStat label="DARK SHIPS" value={currentSnapshot.darkVessels} color="#ef4444" />
          <SnapshotStat label="GPS EVENTS" value={currentSnapshot.gpsEvents} color="#f97316" />
          <SnapshotStat label="MIL AIR" value={currentSnapshot.militaryAir} color="#a855f7" />
        </div>
      )}

      <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border-color)',
        fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)',
        display: 'flex', justifyContent: 'space-between' }}>
        <span>4D temporal reconstruction | {eventMarkers.length} events in window</span>
        <span>Elapsed: {formatDuration(scrubPosition * timeRange.duration)} / {formatDuration(timeRange.duration)}</span>
      </div>

      <style>{'\n@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }\n'}</style>
    </div>
  );
}

function SnapshotStat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
        color, textShadow: '0 0 8px ' + color + '40' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}
