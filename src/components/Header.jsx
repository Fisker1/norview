import React, { useState, useEffect } from 'react';
import useStore, { REGIONS } from '../store';

const REGION_SUBTITLES = {
  norway: 'ARCTIC OSINT COMMAND',
  europe: 'EUROPEAN THEATRE COMMAND',
  global: 'GLOBAL OSINT COMMAND',
};

export default function Header({ onHelpClick }) {
  const region = useStore((s) => s.region);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = time.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 48,
      background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.7) 100%)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent-cyan)',
          boxShadow: 'var(--glow-cyan)',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
          letterSpacing: 4, color: 'var(--accent-cyan)',
        }}>
          NORVIEW
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: 2, marginLeft: 4,
        }}>
          {REGION_SUBTITLES[region] || 'OSINT COMMAND'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-green)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)',
            boxShadow: 'var(--glow-green)',
          }} />
          SYSTEMS NOMINAL
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)',
          letterSpacing: 1,
        }}>
          {utc}
        </div>
        <button
          onClick={onHelpClick}
          title="Help & instructions"
          style={{
            background: 'none', border: '1px solid var(--border-color)',
            color: 'var(--text-dim)', cursor: 'pointer',
            width: 26, height: 26, borderRadius: 4,
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            e.currentTarget.style.color = 'var(--accent-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-dim)';
          }}
        >
          ?
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
