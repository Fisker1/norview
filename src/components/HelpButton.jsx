import React from 'react';

export default function HelpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Open help & instructions"
      style={{
        position: 'absolute', bottom: 44, right: 16, zIndex: 100,
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        color: 'var(--accent-cyan)',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.2s',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-cyan)';
        e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
      }}
    >
      ?
    </button>
  );
}
