import React from 'react';
import useStore from '../store';

export default function EntityPanel() {
  const entity = useStore((s) => s.selectedEntity);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);

  if (!entity) return null;

  return (
    <div style={{
      position: 'absolute', top: 58, right: 12, width: 280, zIndex: 100,
      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
      borderRadius: 8, padding: 16, backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: 2,
        }}>
          {entity.type?.toUpperCase() || 'ENTITY'} INTEL
        </span>
        <button
          onClick={() => setSelectedEntity(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
        color: entity.color || 'var(--accent-cyan)', marginBottom: 12,
      }}>
        {entity.name || entity.id || 'UNKNOWN'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entity.details && Object.entries(entity.details).map(([k, v]) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)', fontSize: 10,
          }}>
            <span style={{ color: 'var(--text-dim)', letterSpacing: 1 }}>{k.toUpperCase()}</span>
            <span style={{ color: 'var(--text-primary)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
