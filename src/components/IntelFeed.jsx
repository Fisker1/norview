import React, { useState, useMemo, useEffect, useCallback } from 'react';
import useStore from '../store';
import { generateIntelReports, INTEL_TYPES, CLASSIFICATION_LEVELS, PRIORITY } from '../utils/intelGenerator';

const REFRESH_INTERVAL = 90000;

export default function IntelFeed() {
  const [isOpen, setIsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [prioFilter, setPrioFilter] = useState('ALL');
  const [reports, setReports] = useState([]);
  const region = useStore((s) => s.region);
  const addAlert = useStore((s) => s.addAlert);

  const refreshReports = useCallback(() => {
    const newReports = generateIntelReports(region);
    setReports(newReports);
    newReports.filter((r) => r.priority === 'FLASH').slice(0, 2).forEach((r) => {
      addAlert({
        type: 'intel-flash',
        severity: 'critical',
        title: `INTEL FLASH \u2014 ${r.title}`,
        message: `[${r.type}] ${r.summary}`,
        timestamp: new Date(),
      });
    });
  }, [region, addAlert]);

  useEffect(() => {
    refreshReports();
    const iv = setInterval(refreshReports, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [refreshReports]);

  const filtered = useMemo(() => {
    let list = reports;
    if (typeFilter !== 'ALL') list = list.filter((r) => r.type === typeFilter);
    if (prioFilter !== 'ALL') list = list.filter((r) => r.priority === prioFilter);
    return list;
  }, [reports, typeFilter, prioFilter]);

  const counts = useMemo(() => {
    const c = { FLASH: 0, IMMEDIATE: 0, PRIORITY: 0, ROUTINE: 0 };
    reports.forEach((r) => { if (c[r.priority] !== undefined) c[r.priority]++; });
    return c;
  }, [reports]);

  const flashCount = counts.FLASH;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', top: 58, left: 244, zIndex: 100,
          background: flashCount > 0 ? '#ef444425' : 'var(--bg-panel)',
          border: '1px solid var(--border-color)', borderRadius: 8,
          padding: '8px 14px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--text-primary)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
      >
        <span style={{ fontSize: 13 }}>{'\ud83d\udcf0'}</span>
        <span style={{ letterSpacing: 1 }}>INTEL FEED</span>
        {reports.length > 0 && (
          <span style={{
            background: flashCount > 0 ? '#ef4444' : '#3b82f6',
            color: '#000', borderRadius: 10, padding: '1px 7px',
            fontSize: 10, fontWeight: 700,
          }}>
            {reports.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', top: 58, left: 244, zIndex: 100,
      width: 400, maxHeight: 'calc(100vh - 120px)',
      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
      borderRadius: 8, backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>{'\ud83d\udcf0'}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', letterSpacing: 2,
          }}>
            MULTI-INT OSINT FEED
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={refreshReports} style={{
            background: 'none', border: '1px solid var(--border-color)',
            borderRadius: 4, color: 'var(--text-dim)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px',
          }}>{'\u21BB'} REFRESH</button>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: 16, padding: 0,
          }}>{'\u2715'}</button>
        </div>
      </div>

      {/* INT type filter */}
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', gap: 4, flexWrap: 'wrap',
      }}>
        <FilterBtn label="ALL" active={typeFilter === 'ALL'} color="var(--text-primary)"
          onClick={() => setTypeFilter('ALL')} count={reports.length} />
        {Object.entries(INTEL_TYPES).map(([key, t]) => (
          <FilterBtn key={key} label={`${t.icon} ${t.label}`} active={typeFilter === key}
            color={t.color} onClick={() => setTypeFilter(key)}
            count={reports.filter((r) => r.type === key).length} />
        ))}
      </div>

      {/* Priority filter */}
      <div style={{
        padding: '6px 14px', display: 'flex', gap: 6,
        borderBottom: '1px solid var(--border-color)',
      }}>
        {['ALL', 'FLASH', 'IMMEDIATE', 'PRIORITY', 'ROUTINE'].map((p) => (
          <button key={p} onClick={() => setPrioFilter(p)} style={{
            flex: 1, padding: '3px 0', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600,
            border: prioFilter === p ? '1px solid var(--text-primary)' : '1px solid transparent',
            background: prioFilter === p ? 'var(--text-primary)10' : 'transparent',
            color: p === 'ALL' ? 'var(--text-primary)' : (PRIORITY[p]?.color || '#888'),
            letterSpacing: 1,
          }}>
            {p === 'ALL' ? `ALL (${reports.length})` : counts[p]}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
          }}>
            {reports.length === 0 ? 'Collecting intelligence...' : 'No reports match filter'}
          </div>
        )}
        {filtered.map((r) => {
          const typeInfo = INTEL_TYPES[r.type] || INTEL_TYPES.OSINT;
          const prioInfo = PRIORITY[r.priority] || PRIORITY.ROUTINE;
          const classInfo = CLASSIFICATION_LEVELS.find((c) => c.level === r.classification) || CLASSIFICATION_LEVELS[3];
          return (
            <div key={r.id} style={{
              margin: '0 6px 4px', padding: '10px 12px',
              background: `${prioInfo.color}08`,
              border: `1px solid ${prioInfo.color}25`,
              borderRadius: 6,
              borderLeft: `3px solid ${typeInfo.color}`,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6,
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                    color: typeInfo.color, letterSpacing: 1,
                    padding: '2px 5px', borderRadius: 3,
                    background: `${typeInfo.color}15`,
                    border: `1px solid ${typeInfo.color}40`,
                  }}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 700,
                    color: classInfo.color, letterSpacing: 1,
                    padding: '1px 4px', borderRadius: 2,
                    border: `1px solid ${classInfo.color}40`,
                  }}>
                    {classInfo.abbr}
                  </span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                  color: prioInfo.color, letterSpacing: 1,
                  padding: '2px 6px', borderRadius: 3,
                  background: `${prioInfo.color}15`,
                  border: `1px solid ${prioInfo.color}40`,
                }}>
                  {prioInfo.label}
                </span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                color: 'var(--text-primary)', letterSpacing: 0.5, marginBottom: 4,
              }}>
                {r.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6,
              }}>
                {r.summary}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 4,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)',
                }}>
                  SRC: {r.source}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <ConfidenceBar value={r.confidence} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)',
                  }}>
                    {r.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--border-color)',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>GODS EYE + Maven fusion</span>
        <span>{reports.length} report{reports.length !== 1 ? 's' : ''} | {flashCount} FLASH</span>
      </div>
    </div>
  );
}

function FilterBtn({ label, active, color, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
      fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600,
      border: active ? `1px solid ${color}` : '1px solid transparent',
      background: active ? `${color}15` : 'transparent',
      color: active ? color : 'var(--text-dim)',
      letterSpacing: 0.5, transition: 'all 0.15s',
    }}>
      {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
    </button>
  );
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 30, height: 3, borderRadius: 2,
        background: 'var(--border-color)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${value}%`, height: '100%', borderRadius: 2,
          background: color,
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, color,
      }}>
        {value}%
      </span>
    </div>
  );
            }
