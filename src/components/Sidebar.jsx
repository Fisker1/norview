import React from 'react';
import useStore, { REGIONS } from '../store';

const REGION_LIST = [
  { key: 'norway', icon: '\u{1F1F3}\u{1F1F4}', color: '#00d4ff' },
  { key: 'europe', icon: '\u{1F1EA}\u{1F1FA}', color: '#3b82f6' },
  { key: 'global', icon: '\u{1F30D}', color: '#a855f7' },
];

const LAYERS = [
  { key: 'flights', label: 'FLIGHTS', icon: '\u2708', color: '#00d4ff', desc: 'OpenSky Network' },
  { key: 'vessels', label: 'VESSELS', icon: '\u2693', color: '#22c55e', desc: 'AIS Maritime' },
  { key: 'satellites', label: 'SATELLITES', icon: '\u{1F6F0}', color: '#a855f7', desc: 'CelesTrak TLE' },
  { key: 'airspaces', label: 'AIRSPACE', icon: '\u{1F6E1}', color: '#f59e0b', desc: 'Restricted Zones' },
  { key: 'gpsJamming', label: 'GPS JAMMING', icon: '\u{1F4E1}', color: '#ef4444', desc: 'EW Interference' },
  { key: 'geofences', label: 'GEOFENCES', icon: '\u{1F3AF}', color: '#f43f5e', desc: 'AOI Alert Zones' },
  { key: 'weather', label: 'WEATHER', icon: '\u{1F326}', color: '#06b6d4', desc: 'Open-Meteo WX' },
];

const FILTERS = [
  { key: 'normal', label: 'STD', icon: '\u25C9' },
  { key: 'nightvision', label: 'NV', icon: '\u{1F7E2}' },
  { key: 'thermal', label: 'FLIR', icon: '\u{1F534}' },
  { key: 'crt', label: 'CRT', icon: '\u{1F4FA}' },
];

export default function Sidebar() {
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const visualFilter = useStore((s) => s.visualFilter);
  const setVisualFilter = useStore((s) => s.setVisualFilter);
  const stats = useStore((s) => s.stats);
  const region = useStore((s) => s.region);
  const setRegion = useStore((s) => s.setRegion);

  return (
    <div style={{
      position: 'absolute', top: 58, left: 12, width: 220, zIndex: 100,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxHeight: 'calc(100vh - 180px)', overflowY: 'auto',
    }}>
      {/* Region Selector */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: 8, padding: 14, backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: 2, marginBottom: 10,
        }}>
          REGION SCOPE
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {REGION_LIST.map((r) => {
            const cfg = REGIONS[r.key];
            const active = region === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRegion(r.key)}
                style={{
                  flex: 1, padding: '8px 4px',
                  background: active ? r.color + '20' : 'transparent',
                  border: '1px solid ' + (active ? r.color : 'var(--border-color)'),
                  borderRadius: 6, cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                  letterSpacing: 1,
                  color: active ? r.color : 'var(--text-dim)',
                }}>
                  {cfg.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7,
                  color: 'var(--text-dim)', opacity: 0.7,
                }}>
                  {cfg.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer Controls */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: 8, padding: 14, backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: 2, marginBottom: 12,
        }}>
          DATA LAYERS
        </div>
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => toggleLayer(l.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '8px 10px', marginBottom: 4,
              background: layers[l.key] ? l.color + '15' : 'transparent',
              border: '1px solid ' + (layers[l.key] ? l.color + '40' : 'transparent'),
              borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
              color: layers[l.key] ? 'var(--text-primary)' : 'var(--text-dim)',
            }}
          >
            <span style={{ fontSize: 14 }}>{l.icon}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: 1,
              }}>{l.label}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)',
              }}>{l.desc}</div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: layers[l.key] ? l.color : 'var(--text-dim)',
              boxShadow: layers[l.key] ? '0 0 8px ' + l.color + '80' : 'none',
              transition: 'all 0.3s',
            }} />
          </button>
        ))}
      </div>

      {/* Visual Filters */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: 8, padding: 14, backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: 2, marginBottom: 10,
        }}>
          VISUAL MODE
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setVisualFilter(f.key)}
              style={{
                flex: 1, padding: '6px 4px',
                background: visualFilter === f.key ? 'var(--accent-cyan)20' : 'transparent',
                border: '1px solid ' + (visualFilter === f.key ? 'var(--accent-cyan)' : 'var(--border-color)'),
                borderRadius: 4, cursor: 'pointer',
                color: visualFilter === f.key ? 'var(--accent-cyan)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1,
                transition: 'all 0.2s',
              }}
              title={f.label}
            >
              <div style={{ fontSize: 14, marginBottom: 2 }}>{f.icon}</div>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Stats */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: 8, padding: 14, backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: 2, marginBottom: 10,
        }}>
          LIVE TRACKING
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StatRow label="AIRCRAFT" value={stats.flights} color="#00d4ff" />
          <StatRow label="\u21b3 MILITARY" value={stats.militaryFlights || 0} color="#ef4444" indent />
          <StatRow label="VESSELS" value={stats.vessels} color="#22c55e" />
          <StatRow label="\u21b3 DARK" value={stats.darkVessels || 0} color="#ef4444" indent />
          <StatRow label="\u21b3 ANOMALY" value={stats.vesselAnomalies || 0} color="#f59e0b" indent />
          <StatRow label="SATELLITES" value={stats.satellites} color="#a855f7" />
        </div>
      </div>

      {/* Threat Summary */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: 8, padding: 14, backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444',
          letterSpacing: 2, marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
            animation: 'pulse 2s infinite',
          }} />
          THREAT POSTURE
        </div>
        <ThreatIndicator
          label="GPS INTEGRITY"
          level={2}
          labels={['NOMINAL', 'DEGRADED', 'DENIED']}
          colors={['#22c55e', '#f59e0b', '#ef4444']}
        />
        <ThreatIndicator
          label="MARITIME"
          level={stats.vesselAnomalies > 5 ? 2 : stats.vesselAnomalies > 0 ? 1 : 0}
          labels={['NORMAL', 'ELEVATED', 'HIGH']}
          colors={['#22c55e', '#f59e0b', '#ef4444']}
        />
        <ThreatIndicator
          label="AIRSPACE"
          level={stats.militaryFlights > 3 ? 2 : stats.militaryFlights > 0 ? 1 : 0}
          labels={['CLEAR', 'ACTIVE', 'CONTESTED']}
          colors={['#22c55e', '#f59e0b', '#ef4444']}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, color, indent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingLeft: indent ? 8 : 0,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: indent ? 9 : 10, color: 'var(--text-dim)',
      }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: indent ? 12 : 14, fontWeight: 700,
        color, textShadow: '0 0 10px ' + color + '60',
      }}>{(value || 0).toLocaleString()}</span>
    </div>
  );
}

function ThreatIndicator({ label, level, labels, colors }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: colors[level] }}>{labels[level]}</span>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= level ? colors[level] : 'var(--border-color)',
            opacity: i <= level ? 0.8 : 0.3,
            boxShadow: i <= level ? '0 0 6px ' + colors[level] + '40' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
            }
