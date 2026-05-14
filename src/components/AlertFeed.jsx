import React from 'react';
import useStore from '../store';

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', dot: '#ef4444', label: 'CRIT' },
  warning: { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.35)', dot: '#f59e0b', label: 'WARN' },
  info: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.30)', dot: '#3b82f6', label: 'INFO' },
};

const TYPE_ICONS = {
  'military-aircraft': '✈',
  'vessel-anomaly': '⚓',
  'gps-jamming': '📡',
  'airspace-violation': '🛡',
  'dark-vessel': '👁',
  'default': '⚡',
};

export default function AlertFeed() {
  const alerts = useStore((s) => s.alerts);
  const clearAlerts = useStore((s) => s.clearAlerts);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 58, right: 12, width: 300, maxHeight: 'calc(100vh - 120px)',
      zIndex: 90, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: '8px 8px 0 0', padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
            animation: 'pulse 1.5s infinite',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
            letterSpacing: 2,
          }}>
            ALERT FEED
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-red)',
            background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: 3,
          }}>
            {alerts.length}
          </span>
        </div>
        <button
          onClick={clearAlerts}
          style={{
            background: 'none', border: '1px solid var(--border-color)',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 8px',
            borderRadius: 3, letterSpacing: 1,
          }}
        >
          CLEAR
        </button>
      </div>

      {/* Alert list */}
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderTop: 'none', borderRadius: '0 0 8px 8px',
        backdropFilter: 'blur(12px)',
        overflowY: 'auto', maxHeight: 400,
        padding: '4px',
      }}>
        {alerts.slice(0, 50).map((alert, i) => {
          const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
          const icon = TYPE_ICONS[alert.type] || TYPE_ICONS.default;
          const time = alert.timestamp instanceof Date
            ? alert.timestamp.toISOString().slice(11, 19)
            : 'N/A';

          return (
            <div
              key={i}
              style={{
                background: style.bg, border: `1px solid ${style.border}`,
                borderRadius: 6, padding: '8px 10px', marginBottom: 3,
                animation: i === 0 ? 'slideIn 0.3s ease-out' : undefined,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: style.dot, letterSpacing: 1,
                  background: `${style.dot}20`, padding: '1px 4px', borderRadius: 2,
                }}>
                  {style.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: 'var(--text-dim)', marginLeft: 'auto',
                }}>
                  {time}
                </span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                color: 'var(--text-primary)', marginBottom: 2,
              }}>
                {alert.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--text-secondary)', lineHeight: 1.4,
              }}>
                {alert.message}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
