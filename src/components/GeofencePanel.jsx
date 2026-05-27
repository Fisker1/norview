import React, { useState, useMemo } from 'react';
import useStore from '../store';
import { GEOFENCE_ZONES, PRIORITY_COLORS, getVisibleGeofences } from '../layers/GeofenceLayer';

const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function GeofencePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const region = useStore((s) => s.region);
  const geofenceStats = useStore((s) => s.geofenceStats);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);

  const zones = useMemo(() => {
    const visible = getVisibleGeofences(region);
    const sorted = [...visible].sort((a, b) =>
      (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3)
    );
    if (filterPriority === 'ALL') return sorted;
    return sorted.filter((z) => z.priority === filterPriority);
  }, [region, filterPriority]);

  const totalEntities = useMemo(() => {
    if (!geofenceStats) return 0;
    return Object.values(geofenceStats).reduce((sum, s) => sum + (s.total || 0), 0);
  }, [geofenceStats]);

  const criticalZonesActive = useMemo(() => {
    if (!geofenceStats) return 0;
    return zones.filter((z) => z.priority === 'CRITICAL' && geofenceStats[z.id]?.total > 0).length;
  }, [zones, geofenceStats]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', bottom: 82, left: 12, zIndex: 100,
          background: criticalZonesActive > 0 ? '#ef444430' : 'var(--bg-panel)',
          border: '1px solid ' + (criticalZonesActive > 0 ? '#ef444460' : 'var(--border-color)'),
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>\ud83c\udfaf</span>
        <span>GEOFENCES</span>
        {totalEntities > 0 && (
          <span style={{
            background: criticalZonesActive > 0 ? '#ef4444' : '#f59e0b',
            color: '#000', borderRadius: 10, padding: '1px 7px',
            fontSize: 10, fontWeight: 700,
          }}>
            {totalEntities}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: 82, left: 12, zIndex: 100,
      width: 340, maxHeight: 'calc(100vh - 160px)',
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
          GEOFENCE MONITOR \u2014 AOI
        </div>
        <button onClick={() => setIsOpen(false)} style={{
          background: 'none', border: 'none', color: 'var(--text-dim)',
          cursor: 'pointer', fontSize: 16, padding: 0,
        }}>\u2715</button>
      </div>

      {/* Priority filter */}
      <div style={{
        padding: '8px 14px', display: 'flex', gap: 6,
        borderBottom: '1px solid var(--border-color)',
      }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((p) => (
          <button key={p} onClick={() => setFilterPriority(p)} style={{
            flex: 1, padding: '4px 0', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
            border: filterPriority === p ? '1px solid var(--text-primary)' : '1px solid transparent',
            background: filterPriority === p ? 'var(--text-primary)10' : 'transparent',
            color: p === 'ALL' ? 'var(--text-primary)' : (PRIORITY_COLORS[p]?.glow || 'var(--text-dim)'),
            letterSpacing: 1,
          }}>
            {p === 'ALL' ? 'ALL (' + zones.length + ')' : p.slice(0, 4)}
          </button>
        ))}
      </div>

      {/* Zone list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {zones.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
          }}>
            No zones at this priority level
          </div>
        )}
        {zones.map((zone) => {
          const stats = geofenceStats?.[zone.id] || { flights: 0, vessels: 0, satellites: 0, total: 0 };
          const colors = PRIORITY_COLORS[zone.priority] || PRIORITY_COLORS['MEDIUM'];
          return (
            <button
              key={zone.id}
              onClick={() => setSelectedEntity({
                type: 'geofence', name: zone.name,
                color: colors.stroke, id: zone.id,
                details: {
                  priority: zone.priority,
                  description: zone.description,
                  'entities inside': stats.total + ' (aircraft: ' + stats.flights + ' vessels: ' + stats.vessels + ' satellites: ' + stats.satellites + ')',
                  scope: zone.scope.toUpperCase(),
                },
              })}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '8px 14px', marginBottom: 1,
                background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                fontSize: 14, flexShrink: 0, marginTop: 1,
                filter: stats.total > 0 ? 'none' : 'grayscale(0.6)',
              }}>
                \ud83c\udfaf
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                  color: 'var(--text-primary)', letterSpacing: 0.5,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {zone.name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: 'var(--text-dim)', marginTop: 2,
                }}>
                  {zone.description.length > 55 ? zone.description.slice(0, 52) + '...' : zone.description}
                </div>
                {stats.total > 0 && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: colors.glow, marginTop: 3,
                    display: 'flex', gap: 8,
                  }}>
                    {stats.flights > 0 && <span>aircraft: {stats.flights}</span>}
                    {stats.vessels > 0 && <span>vessels: {stats.vessels}</span>}
                    {stats.satellites > 0 && <span>sats: {stats.satellites}</span>}
                  </div>
                )}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                color: colors.glow, letterSpacing: 1,
                flexShrink: 0, marginTop: 2,
                padding: '2px 6px', borderRadius: 3,
                background: colors.glow + '15',
                border: '1px solid ' + colors.glow + '40',
              }}>
                {zone.priority}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--border-color)',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Maven AOI mode</span>
        <span>{totalEntities} entities in zones</span>
      </div>
    </div>
  );
}
