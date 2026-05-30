import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import useStore from '../store';
import { getMilitaryColor } from '../utils/militaryClassifier';

/**
 * SearchPanel - Unified Entity Search & Watchlist
 *
 * Inspired by Palantir Maven Smart System unified entity query interface
 * and Bilawal Sidhu GODS EYE entity filtering / highlight system.
 * Allows analysts to search across all tracked domains (AIR, MARITIME, SPACE)
 * from a single panel, pin entities to a watchlist, and fly the camera to them.
 *
 * Keyboard shortcut: Ctrl+K / Cmd+K to toggle.
 */

const TYPE_CONFIG = {
  flight: { icon: '✈', label: 'AIRCRAFT', color: '#00d4ff' },
  vessel: { icon: '⚓', label: 'VESSEL', color: '#22c55e' },
  satellite: { icon: '🛰', label: 'SATELLITE', color: '#a855f7' },
};

const TYPE_FILTERS = [
  { key: 'ALL', label: 'ALL', color: 'var(--text-primary)' },
  { key: 'flight', label: '✈ AIR', color: '#00d4ff' },
  { key: 'vessel', label: '⚓ SEA', color: '#22c55e' },
  { key: 'satellite', label: '🛰 SPACE', color: '#a855f7' },
];

function getVesselColor(vessel) {
  if (vessel.anomalyScore >= 50) return '#ef4444';
  if (vessel.anomalyScore >= 25) return '#f59e0b';
  if (!vessel.aisActive) return '#ef4444';
  switch (vessel.type) {
    case 'tanker': return '#f59e0b';
    case 'cargo': return '#22c55e';
    case 'fishing': return '#3b82f6';
    case 'research': return '#a855f7';
    case 'supply': return '#06b6d4';
    case 'cruise': return '#ec4899';
    case 'passenger': return '#8b5cf6';
    case 'military': return '#ef4444';
    default: return '#22c55e';
  }
}

export default function SearchPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const inputRef = useRef(null);

  const flights = useStore((s) => s.flights);
  const vessels = useStore((s) => s.vessels);
  const satellites = useStore((s) => s.satellites);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const watchlist = useStore((s) => s.watchlist);
  const addToWatchlist = useStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useStore((s) => s.removeFromWatchlist);

  // Ctrl+K / Cmd+K to toggle
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setTypeFilter('ALL');
    }
  }, [isOpen]);

  // Build unified entity list
  const allEntities = useMemo(() => {
    const entities = [];

    (flights || []).forEach((f) => {
      if (f.onGround) return;
      entities.push({
        id: f.icao24 || f.callsign,
        type: 'flight',
        name: f.callsign || f.icao24 || 'UNKNOWN',
        secondary: f.classification?.description || f.country || '',
        tags: [
          f.classification?.classification !== 'civilian' ? 'MILITARY' : 'CIVIL',
          f.country,
        ].filter(Boolean),
        lat: f.lat || f.latitude,
        lon: f.lon || f.longitude,
        color: getMilitaryColor(f.classification),
        severity: f.classification?.classification !== 'civilian' ? 'high' : 'normal',
        raw: f,
        entityData: {
          type: 'flight', name: f.callsign || f.icao24,
          color: getMilitaryColor(f.classification), id: f.icao24,
          details: {
            callsign: f.callsign || 'N/A', icao24: f.icao24, country: f.country,
            classification: (f.classification?.classification || 'civilian').toUpperCase(),
            description: f.classification?.description || '',
            altitude: `${Math.round(f.altitude || 0)}m`,
            speed: `${Math.round(f.velocity || 0)}m/s`,
            heading: `${Math.round(f.heading || 0)}°`,
          },
        },
      });
    });

    (vessels || []).forEach((v) => {
      entities.push({
        id: String(v.mmsi),
        type: 'vessel',
        name: v.name || String(v.mmsi),
        secondary: `${(v.type || '').toUpperCase()} | ${v.flag || '??'} | ${v.speed || 0} kts`,
        tags: [
          v.type?.toUpperCase(),
          v.flag,
          !v.aisActive ? 'DARK' : null,
          v.anomalyScore >= 25 ? 'ANOMALY' : null,
        ].filter(Boolean),
        lat: v.lat,
        lon: v.lon,
        color: getVesselColor(v),
        severity: v.anomalyScore >= 50 ? 'critical' : v.anomalyScore >= 25 ? 'high' : 'normal',
        raw: v,
        entityData: {
          type: 'vessel', name: v.name || String(v.mmsi),
          color: getVesselColor(v), id: v.mmsi,
          details: {
            mmsi: v.mmsi, type: v.type, flag: v.flag,
            speed: `${v.speed} kts`, heading: `${v.heading}°`,
            route: v.route, status: v.status,
            ais: v.aisActive ? 'ACTIVE' : '⚠ DARK',
            'anomaly score': `${v.anomalyScore}/100`,
            ...(v.anomalyReasons?.length > 0 && { alerts: v.anomalyReasons.join(', ') }),
          },
        },
      });
    });

    (satellites || []).forEach((s) => {
      entities.push({
        id: String(s.noradId || s.name),
        type: 'satellite',
        name: s.name || 'UNKNOWN',
        secondary: `${(s.type || s.classification || 'unknown').toUpperCase()} | NORAD ${s.noradId || '?'}`,
        tags: [
          s.type || s.classification || 'unknown',
          s.country,
        ].filter(Boolean).map((t) => t.toUpperCase()),
        lat: s.lat,
        lon: s.lon,
        color: s.type === 'military' || s.classification === 'military' ? '#ef4444' : '#a855f7',
        severity: s.type === 'military' || s.classification === 'military' ? 'high' : 'normal',
        raw: s,
        entityData: {
          type: 'satellite', name: s.name,
          color: s.type === 'military' || s.classification === 'military' ? '#ef4444' : '#a855f7',
          id: s.noradId || s.name,
          details: {
            name: s.name, noradId: s.noradId || 'N/A',
            type: (s.type || s.classification || 'unknown').toUpperCase(),
            country: s.country || 'N/A',
          },
        },
      });
    });

    return entities;
  }, [flights, vessels, satellites]);

  // Search and filter
  const results = useMemo(() => {
    let list = allEntities;
    if (typeFilter !== 'ALL') {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.secondary.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    const sevOrder = { critical: 0, high: 1, normal: 2 };
    list.sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3) || a.name.localeCompare(b.name));
    return list.slice(0, 100);
  }, [allEntities, query, typeFilter]);

  const watchlistEntities = useMemo(() => {
    if (!watchlist || watchlist.length === 0) return [];
    const watchSet = new Set(watchlist);
    return allEntities.filter((e) => watchSet.has(e.id));
  }, [allEntities, watchlist]);

  const handleSelect = useCallback((entity) => {
    setSelectedEntity(entity.entityData);
  }, [setSelectedEntity]);

  const isWatchlisted = useCallback((id) => {
    return watchlist && watchlist.includes(id);
  }, [watchlist]);

  const counts = useMemo(() => ({
    ALL: allEntities.length,
    flight: allEntities.filter((e) => e.type === 'flight').length,
    vessel: allEntities.filter((e) => e.type === 'vessel').length,
    satellite: allEntities.filter((e) => e.type === 'satellite').length,
  }), [allEntities]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', top: 58, left: 244 + 140, zIndex: 100,
          background: 'var(--bg-panel)',
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
        <span style={{ fontSize: 13 }}>🔍</span>
        <span style={{ letterSpacing: 1 }}>SEARCH</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)',
          padding: '2px 5px', borderRadius: 3, border: '1px solid var(--border-color)',
        }}>
          ⌘K
        </span>
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', top: 58, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, width: 520, maxHeight: 'calc(100vh - 120px)',
      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
      borderRadius: 8, backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', letterSpacing: 2,
          }}>
            ENTITY SEARCH — MAVEN QUERY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)' }}>
            ESC to close
          </span>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: 16, padding: 0,
          }}>✕</button>
        </div>
      </div>

      {/* Search input */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
          borderRadius: 6, padding: '6px 10px',
        }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search callsign, MMSI, name, flag, type..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)',
              letterSpacing: 0.5,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'none', border: 'none', color: 'var(--text-dim)',
              cursor: 'pointer', fontSize: 14, padding: 0,
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Type filter */}
      <div style={{
        padding: '8px 14px', display: 'flex', gap: 6,
        borderBottom: '1px solid var(--border-color)',
      }}>
        {TYPE_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)} style={{
            flex: 1, padding: '4px 0', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
            border: typeFilter === f.key ? `1px solid ${f.color}` : '1px solid transparent',
            background: typeFilter === f.key ? `${f.color}15` : 'transparent',
            color: typeFilter === f.key ? f.color : 'var(--text-dim)',
            letterSpacing: 1, transition: 'all 0.15s',
          }}>
            {f.label} ({counts[f.key] || 0})
          </button>
        ))}
      </div>

      {/* Watchlist */}
      {watchlistEntities.length > 0 && (
        <div style={{
          padding: '8px 14px', borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: '#f59e0b',
            letterSpacing: 2, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#f59e0b',
              boxShadow: '0 0 6px rgba(245,158,11,0.5)',
            }} />
            WATCHLIST ({watchlistEntities.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {watchlistEntities.map((e) => {
              const cfg = TYPE_CONFIG[e.type];
              return (
                <button
                  key={'wl-' + e.id}
                  onClick={() => handleSelect(e)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                    background: `${e.color}15`, border: `1px solid ${e.color}40`,
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: e.color, transition: 'all 0.15s',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = `${e.color}30`; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = `${e.color}15`; }}
                >
                  <span style={{ fontSize: 10 }}>{cfg?.icon}</span>
                  {e.name}
                  <span
                    onClick={(ev) => { ev.stopPropagation(); removeFromWatchlist(e.id); }}
                    style={{ cursor: 'pointer', opacity: 0.6, fontSize: 10, marginLeft: 2 }}
                  >✕</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {results.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
          }}>
            {query ? 'No entities match query' : 'Type to search across all domains'}
          </div>
        )}
        {results.map((e) => {
          const cfg = TYPE_CONFIG[e.type];
          const pinned = isWatchlisted(e.id);
          return (
            <button
              key={e.type + '-' + e.id}
              onClick={() => handleSelect(e)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '8px 14px', marginBottom: 1,
                background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                {cfg?.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                    color: 'var(--text-primary)', letterSpacing: 0.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {e.name}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 7,
                    color: cfg?.color, letterSpacing: 1,
                    padding: '1px 4px', borderRadius: 2,
                    border: `1px solid ${cfg?.color}40`,
                  }}>
                    {cfg?.label}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: 'var(--text-dim)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {e.secondary}
                </div>
                {e.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                    {e.tags.slice(0, 4).map((tag, i) => {
                      const isAlert = ['DARK', 'ANOMALY', 'MILITARY'].includes(tag);
                      return (
                        <span key={i} style={{
                          fontFamily: 'var(--font-mono)', fontSize: 7,
                          color: isAlert ? '#ef4444' : 'var(--text-dim)',
                          letterSpacing: 0.5,
                          padding: '1px 4px', borderRadius: 2,
                          background: isAlert ? '#ef444415' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isAlert ? '#ef444440' : 'var(--border-color)'}`,
                        }}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (pinned) { removeFromWatchlist(e.id); } else { addToWatchlist(e.id); }
                }}
                title={pinned ? 'Remove from watchlist' : 'Add to watchlist'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, flexShrink: 0, marginTop: 2, padding: '2px 4px',
                  color: pinned ? '#f59e0b' : 'var(--text-dim)',
                  opacity: pinned ? 1 : 0.4,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.opacity = pinned ? '1' : '0.4'; }}
              >
                {pinned ? '★' : '☆'}
              </button>
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
        <span>Maven Smart System query</span>
        <span>
          {results.length} result{results.length !== 1 ? 's' : ''} | {allEntities.length} entities tracked
        </span>
      </div>
    </div>
  );
}
