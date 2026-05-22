import React, { useMemo } from 'react';
import useStore from '../store';

const EC = { flight: '#00d4ff', vessel: '#22c55e', satellite: '#a855f7' };

function classifyThreats(fl, ve) {
  let c = 0, h = 0, m = 0, l = 0;
  (fl || []).forEach((f) => { if (f.military && f.lat > 68) c++; else if (f.military) h++; else if (!f.callsign || f.callsign.trim() === '') m++; else l++; });
  (ve || []).forEach((v) => { if (v.dark || v.aisOff) c++; else if (v.anomaly) h++; else if (v.speed && v.speed > 25) m++; else l++; });
  return { critical: c, high: h, medium: m, low: l };
}

export default function PanopticOverlay() {
  const panopticMode = useStore((s) => s.panopticMode);
  const togglePanoptic = useStore((s) => s.togglePanoptic);
  const flights = useStore((s) => s.flights);
  const vessels = useStore((s) => s.vessels);
  const satellites = useStore((s) => s.satellites);
  const threats = useMemo(() => classifyThreats(flights, vessels), [flights, vessels]);
  const total = (flights?.length || 0) + (vessels?.length || 0) + (satellites?.length || 0);

  const btnStyle = {
    position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: 3,
    color: panopticMode ? '#ef4444' : 'var(--text-dim)',
    background: panopticMode ? 'rgba(239,68,68,0.12)' : 'var(--bg-panel)',
    border: panopticMode ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-color)',
    borderRadius: 6, padding: '6px 18px', backdropFilter: 'blur(12px)',
    transition: 'all 0.3s ease', boxShadow: panopticMode ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
  };

  const hudBox = {
    position: 'fixed', zIndex: 200, pointerEvents: 'none',
    fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.7,
    background: 'rgba(14,14,22,0.85)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 6, padding: '10px 14px', minWidth: 180,
  };

  const hudTitle = { fontSize: 9, letterSpacing: 2, color: '#ef4444', marginBottom: 8, borderBottom: '1px solid rgba(239,68,68,0.15)', paddingBottom: 6 };
  const row = (color) => ({ display: 'flex', justifyContent: 'space-between', color });

  const THREATS = [
    { label: 'CRITICAL', count: threats.critical, color: '#ef4444' },
    { label: 'HIGH', count: threats.high, color: '#f97316' },
    { label: 'MEDIUM', count: threats.medium, color: '#eab308' },
    { label: 'LOW', count: threats.low, color: '#22c55e' },
  ];

  return (
    <>
      <button onClick={togglePanoptic} style={btnStyle}>
        {panopticMode ? '\u25C9 PANOPTIC ON' : '\u25CB PANOPTIC'}
      </button>
      {panopticMode && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none', border: '2px solid rgba(239,68,68,0.6)', boxShadow: 'inset 0 0 60px rgba(239,68,68,0.15)' }}>
            {[[0,0],[1,0],[0,1],[1,1]].map(([x,y],i) => (
              <div key={i} style={{ position:'absolute', [y===0?'top':'bottom']:8, [x===0?'left':'right']:8, width:32, height:32, borderTop:y===0?'2px solid #ef4444':'none', borderBottom:y===1?'2px solid #ef4444':'none', borderLeft:x===0?'2px solid #ef4444':'none', borderRight:x===1?'2px solid #ef4444':'none', animation:'panopticPulse 2s ease-in-out infinite' }} />
            ))}
            <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,rgba(239,68,68,0.4),transparent)', animation:'panopticScan 4s linear infinite' }} />
          </div>
          <div style={{ position:'fixed', top:10, left:'50%', transform:'translateX(-50%)', zIndex:200, pointerEvents:'none' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, letterSpacing:4, color:'#ef4444', textShadow:'0 0 10px rgba(239,68,68,0.5)', animation:'panopticPulse 2s ease-in-out infinite', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:4, padding:'4px 14px' }}>
              PANOPTIC MODE ACTIVE
            </div>
          </div>
          <div style={{ ...hudBox, top: 60, right: 14 }}>
            <div style={hudTitle}>ENTITY TRACKING</div>
            <div style={row(EC.flight)}><span>AIRCRAFT</span><span style={{fontWeight:700}}>{flights?.length||0}</span></div>
            <div style={row(EC.vessel)}><span>VESSELS</span><span style={{fontWeight:700}}>{vessels?.length||0}</span></div>
            <div style={row(EC.satellite)}><span>SATELLITES</span><span style={{fontWeight:700}}>{satellites?.length||0}</span></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(239,68,68,0.15)',display:'flex',justifyContent:'space-between',color:'#ef4444',fontWeight:700}}><span>TOTAL</span><span>{total}</span></div>
          </div>
          <div style={{ ...hudBox, bottom: 50, right: 14 }}>
            <div style={hudTitle}>THREAT CLASSIFICATION</div>
            {THREATS.map((t) => (
              <div key={t.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:t.color,display:'inline-block',boxShadow:t.count>0?'0 0 6px '+t.color:'none'}} />
                  <span style={{color:t.color}}>{t.label}</span>
                </span>
                <span style={{color:t.color,fontWeight:700}}>{t.count}</span>
              </div>
            ))}
          </div>
          <div style={{position:'fixed',bottom:50,left:14,zIndex:200,pointerEvents:'none',fontFamily:'var(--font-mono)',fontSize:9,color:'rgba(239,68,68,0.5)',letterSpacing:1}}>
            PANOPTIC // {new Date().toISOString().replace('T',' ').substring(0,19)} UTC
          </div>
        </>
      )}
    </>
  );
}
