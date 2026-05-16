import React, { useState, useMemo } from 'react';
import useStore from '../store';
import { runCorrelation } from '../utils/correlationEngine';

const SEVERITY = {
  CRITICAL: { color: '#ef4444', bg: '#ef444418', border: '#ef444440' },
  HIGH:     { color: '#f97316', bg: '#f9731618', border: '#f9731640' },
  MEDIUM:   { color: '#eab308', bg: '#eab30818', border: '#eab30840' },
  LOW:      { color: '#22c55e', bg: '#22c55e18', border: '#22c55e40' },
};

const DOMAIN_COLORS = {
  MARITIME: '#22c55e',
  AIR:      '#00d4ff',
  SPACE:    '#a855f7',
  EW:       '#ef4444',
  INFRA:    '#f59e0b',
};

export default function CorrelationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const flights    = useStore((s) => s.flights);
  const vessels    = useStore((s) => s.vessels);
  const satellites = useStore((s) => s.satellites);

  const correlations = useMemo(
    () => runCorrelation({ flights, vessels, satellites }),
    [flights, vessels, satellites]
  );

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    correlations.forEach((cor) => {
      if (c[cor.severity] !== undefined) c[cor.severity]++;
    });
    return c;
  }, [correlations]);

  const filtered =
    filter === 'ALL'
      ? correlations
      : correlations.filter((c) => c.severity === filter);

  // ── Collapsed button ──────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          bottom: 52,
          right: 12,
          zIndex: 100,
          background: correlations.some((c) => c.severity === 'CRITICAL')
            ? '#ef444425'
            : 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '8px 14px',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-primary)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-cyan)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      >
        <span style={{ fontSize: 13 }}>🔗</span>
        <span style={{ letterSpacing: 1 }}>CORRELATIONS</span>
        {correlations.length > 0 && (
          <span
            style={{
              background: SEVERITY[correlations[0].severity]?.color || '#888',
              color: '#000',
              borderRadius: 10,
              padding: '1px 7px',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {correlations.length}
          </span>
        )}
      </button>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 52,
        right: 12,
        zIndex: 100,
        width: 370,
        maxHeight: 'calc(100vh - 120px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔗</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-dim)',
              letterSpacing: 2,
            }}
          >
            CROSS-DOMAIN CORRELATION
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Domain legend */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {Object.entries(DOMAIN_COLORS).map(([domain, color]) => (
          <span
            key={domain}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color,
              letterSpacing: 1,
              padding: '2px 6px',
              borderRadius: 3,
              border: `1px solid ${color}40`,
              background: `${color}10`,
            }}
          >
            {domain}
          </span>
        ))}
      </div>

      {/* Severity filter bar */}
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter(sev)}
            style={{
              flex: 1,
              padding: '4px 0',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              border:
                filter === sev
                  ? '1px solid var(--text-primary)'
                  : '1px solid transparent',
              background: filter === sev ? 'var(--text-primary)10' : 'transparent',
              color:
                sev === 'ALL'
                  ? 'var(--text-primary)'
                  : SEVERITY[sev]?.color || '#888',
              letterSpacing: 1,
            }}
          >
            {sev === 'ALL' ? `ALL (${correlations.length})` : counts[sev]}
          </button>
        ))}
      </div>

      {/* Correlation list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-dim)',
            }}
          >
            {correlations.length === 0
              ? 'No cross-domain correlations detected'
              : 'No correlations at this level'}
          </div>
        )}

        {filtered.map((cor, i) => {
          const sev = SEVERITY[cor.severity] || SEVERITY.MEDIUM;
          return (
            <div
              key={cor.id}
              style={{
                margin: '0 6px 4px',
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                borderRadius: 6,
                padding: '10px 12px',
                animation: i === 0 ? 'slideIn 0.3s ease-out' : undefined,
              }}
            >
              {/* Title row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: sev.color,
                    letterSpacing: 0.5,
                  }}
                >
                  {cor.title}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    fontWeight: 700,
                    color: sev.color,
                    letterSpacing: 1,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: `${sev.color}20`,
                    border: `1px solid ${sev.color}50`,
                    flexShrink: 0,
                  }}
                >
                  {cor.severity}
                </span>
              </div>

              {/* Domain tags */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {cor.domains.map((d) => (
                  <span
                    key={d}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8,
                      color: DOMAIN_COLORS[d] || '#888',
                      letterSpacing: 1,
                      padding: '1px 5px',
                      borderRadius: 2,
                      border: `1px solid ${DOMAIN_COLORS[d] || '#888'}30`,
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Summary */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: 6,
                }}
              >
                {cor.summary}
              </div>

              {/* Entities */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {cor.entities.slice(0, 6).map((ent, j) => (
                  <span
                    key={j}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8,
                      color: 'var(--text-dim)',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '2px 6px',
                      borderRadius: 3,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {ent.type === 'vessel' && '⚓ '}
                    {ent.type === 'flight' && '✈ '}
                    {ent.type === 'satellite' && '🛰 '}
                    {ent.type === 'gps-zone' && '📡 '}
                    {ent.name}
                  </span>
                ))}
                {cor.entities.length > 6 && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8,
                      color: 'var(--text-dim)',
                    }}
                  >
                    +{cor.entities.length - 6} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--border-color)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-dim)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Maven-style data fusion</span>
        <span>
          {correlations.length} correlation{correlations.length !== 1 ? 's' : ''}{' '}
          detected
        </span>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
