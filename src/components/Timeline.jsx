import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store';

const TIMELINE_HOURS = 6; // Show 6 hours of data
const TICK_INTERVAL = 60000; // 1 minute per tick

export default function Timeline() {
  const events = useStore((s) => s.timelineEvents);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scrubPosition, setScrubPosition] = useState(1); // 0-1, 1 = now
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);

  const startTime = currentTime - TIMELINE_HOURS * 3600 * 1000;

  // Auto-advance time
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setCurrentTime(Date.now());
      setScrubPosition(1);
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying]);

  // Handle scrub
  const handleScrub = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubPosition(x);
    setIsPlaying(false);
  }, []);

  const handleMouseDown = useCallback((e) => {
    handleScrub(e);
    const onMove = (ev) => handleScrub(ev);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleScrub]);

  // Build time marks
  const timeMarks = [];
  for (let i = 0; i <= TIMELINE_HOURS; i++) {
    const t = new Date(startTime + i * 3600 * 1000);
    timeMarks.push({
      position: i / TIMELINE_HOURS,
      label: t.toISOString().slice(11, 16),
    });
  }

  // Event density bars (for the mini chart above timeline)
  const bucketCount = 60; // 60 buckets across the timeline
  const buckets = new Array(bucketCount).fill(0);
  const bucketWidth = (TIMELINE_HOURS * 3600 * 1000) / bucketCount;

  if (events) {
    events.forEach((ev) => {
      const ts = ev.timestamp instanceof Date ? ev.timestamp.getTime() : ev.timestamp;
      const bucket = Math.floor((ts - startTime) / bucketWidth);
      if (bucket >= 0 && bucket < bucketCount) {
        buckets[bucket] += ev.data?.total || ev.data?.military || 1;
      }
    });
  }

  const maxBucket = Math.max(1, ...buckets);
  const scrubTime = new Date(startTime + scrubPosition * TIMELINE_HOURS * 3600 * 1000);

  return (
    <div style={{
      position: 'absolute', bottom: 36, left: 244, right: 12, height: 80,
      zIndex: 100, display: 'flex', flexDirection: 'column',
    }}>
      {/* Scrub time display */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 8px 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { setIsPlaying(!isPlaying); if (!isPlaying) setScrubPosition(1); }}
            style={{
              background: isPlaying ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${isPlaying ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              color: isPlaying ? '#22c55e' : '#f59e0b',
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px',
              borderRadius: 4, cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {isPlaying ? '▶ LIVE' : '⏸ PAUSED'}
          </button>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-cyan)',
            letterSpacing: 1,
          }}>
            {scrubTime.toISOString().replace('T', ' ').slice(0, 19)} UTC
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 5, 10].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              style={{
                background: playbackSpeed === speed ? 'var(--accent-cyan)20' : 'transparent',
                border: `1px solid ${playbackSpeed === speed ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                color: playbackSpeed === speed ? 'var(--accent-cyan)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
                borderRadius: 3, cursor: 'pointer',
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: 8, backdropFilter: 'blur(12px)',
        padding: '8px 12px', flex: 1, display: 'flex', flexDirection: 'column',
      }}>
        {/* Mini event density chart */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 1, height: 20, marginBottom: 4,
        }}>
          {buckets.map((val, i) => (
            <div
              key={i}
              style={{
                flex: 1, background: i / bucketCount <= scrubPosition
                  ? 'var(--accent-cyan)' : 'var(--border-color)',
                opacity: i / bucketCount <= scrubPosition ? 0.6 : 0.2,
                height: `${(val / maxBucket) * 100}%`,
                minHeight: 1, borderRadius: 1,
                transition: 'height 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Scrubber track */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          style={{
            position: 'relative', height: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.03)', borderRadius: 6,
          }}
        >
          {/* Progress fill */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${scrubPosition * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-cyan)30, var(--accent-cyan)60)',
            borderRadius: 6,
          }} />

          {/* Scrub handle */}
          <div style={{
            position: 'absolute', top: -2, left: `${scrubPosition * 100}%`,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--accent-cyan)', border: '2px solid var(--bg-primary)',
            transform: 'translateX(-50%)',
            boxShadow: 'var(--glow-cyan)',
            transition: 'transform 0.1s',
          }} />

          {/* Time marks */}
          {timeMarks.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', top: 16,
              left: `${m.position * 100}%`, transform: 'translateX(-50%)',
              fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)',
            }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
