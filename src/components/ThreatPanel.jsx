import React, { useState, useMemo } from 'react';
import useStore from '../store';

const SEVERITY = {
  CRITICAL: { label: 'CRITICAL', color: '#ef4444', icon: '⚠️' },
  HIGH: { label: 'HIGH', color: '#f97316', icon: '🔴' },
  MEDIUM: { label: 'MEDIUM', color: '#eab308', icon: '🟡' },
  LOW: { label: 'LOW', color: '#22c55e', icon: '🟢' },
};
function scoreFlight(f) {
  const threats = [];
  if (f.military && f.lat > 68) {
    threats.push({ reason: 'Military aircraft in Arctic zone', severity: 'CRITICAL' });
  } else if (f.military) {
    threats.push({ reason: 'Military aircraft detected', severity: 'HIGH' });
  }
  if (f.altitude && f.altitude < 500 && f.altitude > 0) {
    threats.push({ reason: 'Extremely low altitude flight', severity: 'HIGH' });
  }
  if (!f.callsign || f.callsign.trim() === '') {
    threats.push({ reason: 'No callsign / unidentified aircraft', severity: 'MEDIUM' });
  }
  return threats;
}

function scoreVessel(v) {
  const threats = [];
  if (v.dark || v.aisOff) {
    threats.push({ reason: 'Dark vessel — AIS transponder off', severity: 'CRITICAL' });
  }
  if (v.anomaly) {
    threats.push({ reason: 'Anomalous vessel behavior detected', severity: 'HIGH' });
  }
  if (v.speed && v.speed > 25) {
    threats.push({ reason: 'Unusually high speed vessel', severity: 'MEDIUM' });
  }
  if (v.lat > 75) {
    threats.push({ reason: 'Vessel in high-Arctic waters', severity: 'MEDIUM' });
  }
  return threats;
}

function scoreSatellite(s) {
  const threats = [];
  if (s.type === 'military' || s.classification === 'military') {
    threats.push({ reason: 'Military satellite pass overhead', severity: 'MEDIUM' });
  }
  return threats;
}

function getSeverityRank(sev) {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return order[sev] !== undefined ? order[sev] : 4;
}
export default function ThreatPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const flights = useStore((s) => s.flights);
  const vessels = useStore((s) => s.vessels);
  const satellites = useStore((s) => s.satellites);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);

  const threats = useMemo(() => {
    const all = [];

    (flights || []).forEach((f) => {
      scoreFlight(f).forEach((t) => {
        all.push({
          ...t,
          entity: f,
          entityType: 'flight',
          id: f.icao24 || f.callsign || Math.random().toString(36),
          name: f.callsign || f.icao24 || 'Unknown Aircraft',
        });
      });
    });

    (vessels || []).forEach((v) => {
      scoreVessel(v).forEach((t) => {
        all.push({
          ...t,
          entity: v,
          entityType: 'vessel',
          id: v.mmsi || v.name || Math.random().toString(36),
          name: v.name || v.mmsi || 'Unknown Vessel',
        });
      });
    });

    (satellites || []).forEach((s) => {
      scoreSatellite(s).forEach((t) => {
        all.push({
          ...t,
          entity: s,
          entityType: 'satellite',
          id: s.name || s.noradId || Math.random().toString(36),
          name: s.name || 'Unknown Satellite',
        });
      });
    });

    all.sort((a, b) => getSeverityRank(a.severity) - getSeverityRank(b.severity));
    return all;
  }, [flights, vessels, satellites]);

  const filtered = filter === 'ALL' ? threats : threats.filter((t) => t.severity === filter);

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    threats.forEach((t) => { if (c[t.severity] !== undefined) c[t.severity]++; });
    return c;
  }, [threats]);
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', top: 58, right: 12, zIndex: 100,
          background: threats.some((t) => t.severity === 'CRITICAL') ? '#ef444430' : 'var(--bg-panel)',
          border: '1px solid var(--border-color)', borderRadius: 8,
          padding: '8px 14px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span>⚠️</span>
        <span>THREATS</span>
        {threats.length > 0 && (
          <span style={{
            background: SEVERITY[threats[0].severity].color,
            color: '#000', borderRadius: 10, padding: '1px 7px',
            fontSize: 10, fontWeight: 700,
          }}>
            {threats.length}
          </span>
        )}
      </button>
    );
  }
  return (
    <div style={{
      position: 'absolute', top: 58, right: 12, zIndex: 100,
      width: 320, maxHeight: 'calc(100vh - 120px)',
      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
      borderRadius: 8, backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-dim)', letterSpacing: 2,
        }}>
          THREAT ASSESSMENT
        </div>
        <button onClick={() => setIsOpen(false)} style={{
          background: 'none', border: 'none', color: 'var(--text-dim)',
          cursor: 'pointer', fontSize: 16, padding: 0,
        }}>✕</button>
      </div>

      {/* Severity filter bar */}
      <div style={{
        padding: '8px 14px', display: 'flex', gap: 6,
        borderBottom: '1px solid var(--border-color)',
      }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
          <button key={sev} onClick={() => setFilter(sev)} style={{
            flex: 1, padding: '4px 0', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
            border: filter === sev ? '1px solid var(--text-primary)' : '1px solid transparent',
            background: filter === sev ? 'var(--text-primary)10' : 'transparent',
            color: sev === 'ALL' ? 'var(--text-primary)' : SEVERITY[sev].color,
            letterSpacing: 1,
          }}>
            {sev === 'ALL' ? `ALL (${threats.length})` : counts[sev]}
          </button>
        ))}
      </div>
      {/* Threat list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
          }}>
            {threats.length === 0 ? 'No threats detected' : 'No threats at this level'}
          </div>
        )}
        {filtered.map((t, i) => (
          <button
            key={t.id + '-' + i}
            onClick={() => setSelectedEntity(t.entity)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              width: '100%', padding: '8px 14px', marginBottom: 1,
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left', transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
              {t.entityType === 'flight' ? '✈️' : t.entityType === 'vessel' ? '🚢' : '🛰️'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                color: 'var(--text-primary)', letterSpacing: 0.5,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--text-dim)', marginTop: 2,
              }}>
                {t.reason}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
              color: SEVERITY[t.severity].color, letterSpacing: 1,
              flexShrink: 0, marginTop: 2,
              padding: '2px 6px', borderRadius: 3,
              background: SEVERITY[t.severity].color + '15',
              border: '1px solid ' + SEVERITY[t.severity].color + '40',
            }}>
              {SEVERITY[t.severity].label}
            </div>
          </button>
        ))}
      </div>
      {/* Footer */}
      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--border-color)',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Auto-refresh active</span>
        <span>{threats.length} threat{threats.length !== 1 ? 's' : ''} detected</span>
      </div>
    </div>
  );
}
