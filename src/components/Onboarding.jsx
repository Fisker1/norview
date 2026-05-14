import React, { useState } from 'react';

const PAGES = [
  {
    title: 'WELCOME TO NORVIEW',
    subtitle: 'Arctic OSINT Command Center',
    content: [
      {
        heading: 'What is NORVIEW?',
        text: 'NORVIEW is a browser-based geospatial intelligence platform focused on Norway and the Arctic region. It fuses multiple open-source intelligence (OSINT) data feeds onto a 3D globe, giving you real-time situational awareness of air, sea, space, and electronic warfare activity across the Norwegian area of operations.',
      },
      {
        heading: 'Inspired by',
        text: 'Palantir\'s Operation Maven / Gotham platform and Bilawal Sidhu\'s WorldView — rebuilt from scratch using only open-source data and tools.',
      },
    ],
  },
  {
    title: 'NAVIGATION',
    subtitle: 'Globe Controls',
    content: [
      {
        heading: 'Mouse Controls',
        items: [
          ['Left-click + drag', 'Rotate the globe'],
          ['Right-click + drag', 'Zoom in/out'],
          ['Scroll wheel', 'Zoom in/out'],
          ['Middle-click + drag', 'Tilt / change camera angle'],
          ['Click on entity', 'Select — opens detail panel'],
        ],
      },
      {
        heading: 'Touch Controls',
        items: [
          ['One finger drag', 'Rotate the globe'],
          ['Pinch', 'Zoom in/out'],
          ['Two finger drag', 'Tilt camera'],
        ],
      },
    ],
  },
  {
    title: 'DATA LAYERS',
    subtitle: 'Toggle in the sidebar',
    content: [
      {
        heading: 'Live Flight Tracking',
        icon: '✈',
        color: '#00d4ff',
        text: 'Real-time aircraft positions from the OpenSky Network. Updates every 15 seconds. Military aircraft are automatically classified by ICAO hex range and callsign pattern — shown in red with larger markers. Covers Norwegian, Russian, US, UK, NATO, and other military callsigns.',
        source: 'OpenSky Network (live, free, no auth)',
      },
      {
        heading: 'Maritime Vessel Tracking',
        icon: '⚓',
        color: '#22c55e',
        text: 'Ship positions across 5 Norwegian shipping zones: North Sea lanes, coastal route, Barents Sea, Svalbard waters, and offshore oil fields. Includes anomaly detection — vessels are scored (0–100) for suspicious behavior: AIS transponder off, loitering near sensitive infrastructure, unexpected routes, speed anomalies.',
        source: 'Simulated AIS data (real AIS requires paid API — AISHub/MarineTraffic)',
      },
      {
        heading: 'Satellite Orbit Tracking',
        icon: '🛰',
        color: '#a855f7',
        text: 'Real satellite orbits propagated from TLE (Two-Line Element) data. Tracks ISS, Sentinel, NOAA weather sats, military reconnaissance, Starlink, and polar-orbit constellations that pass over Norway. Notable satellites show full orbit paths. Positions update every 10 seconds.',
        source: 'CelesTrak TLE data + satellite.js orbit propagation',
      },
      {
        heading: 'Restricted Airspace',
        icon: '🛡',
        color: '#f59e0b',
        text: 'Norwegian military training areas, danger zones (Andøya rocket range), NATO exercise areas, North Sea helicopter zones, Svalbard restricted approach, and Russian ADIZ buffer zone. Based on Norwegian AIP data.',
        source: 'Norwegian Aeronautical Information Publication (AIP)',
      },
      {
        heading: 'GPS Jamming / EW',
        icon: '📡',
        color: '#ef4444',
        text: '8 known GPS interference zones: Kola Peninsula (Krasukha-4), Finnmark border spillover, Svalbard approach, Northern Barents Sea, Tromsø, Kaliningrad/Baltic, Novaya Zemlya, and North Cape shipping lanes. Severity-coded: red (high), amber (medium), yellow (low).',
        source: 'OSINT reports — aviation authorities, shipping reports, GPSJAM.org',
      },
    ],
  },
  {
    title: 'FEATURES',
    subtitle: 'Tools & Capabilities',
    content: [
      {
        heading: 'Military Aircraft Classification',
        text: 'Every aircraft is automatically classified as civilian, military, government, or surveillance based on ICAO 24-bit address ranges and callsign patterns. Military detections trigger real-time alerts.',
      },
      {
        heading: 'Dark Vessel Detection',
        text: 'Vessels with AIS transponders turned off are flagged in red. The anomaly scoring system evaluates: AIS status, proximity to 7 sensitive Norwegian sites (subsea cables, naval bases, oil fields, radar stations), loitering behavior, flag state, speed anomalies, and vessel type vs. location.',
      },
      {
        heading: 'Visual Modes',
        text: 'Switch between Standard (dark cartographic), Night Vision (green phosphor), FLIR/Thermal (infrared), and CRT (retro scanline) modes. Toggle in the sidebar under VISUAL MODE.',
      },
      {
        heading: 'Alert Feed',
        text: 'Real-time scrolling alert panel (top-right) showing military aircraft detections, vessel anomalies, GPS jamming warnings. Color-coded by severity: CRITICAL (red), WARNING (amber), INFO (blue).',
      },
      {
        heading: 'Timeline Scrubber',
        text: 'The bottom timeline shows 6 hours of event density. Drag the scrub handle to review past data. LIVE mode auto-advances. Playback speed: 1x, 2x, 5x, 10x.',
      },
      {
        heading: 'Threat Posture',
        text: 'The sidebar shows aggregated threat levels for GPS Integrity, Maritime, and Airspace — each rated NOMINAL/DEGRADED/DENIED (or CLEAR/ACTIVE/CONTESTED) based on live data.',
      },
    ],
  },
  {
    title: 'DATA SOURCES',
    subtitle: 'What\'s live vs. simulated',
    content: [
      {
        heading: 'Live Data (real-time)',
        items: [
          ['Flight positions', 'OpenSky Network — free public API, no auth required'],
          ['Satellite orbits', 'CelesTrak TLE data — propagated locally with satellite.js'],
        ],
      },
      {
        heading: 'Static / Modeled Data',
        items: [
          ['GPS jamming zones', 'Based on published OSINT reports (2017–2025)'],
          ['Restricted airspace', 'Norwegian AIP / NOTAM zones'],
          ['Military classification', 'ICAO hex ranges + callsign pattern database'],
        ],
      },
      {
        heading: 'Simulated (placeholder)',
        items: [
          ['AIS vessel data', 'Realistic simulation — real AIS requires AISHub or MarineTraffic API key'],
        ],
      },
      {
        heading: 'API Endpoints',
        items: [
          ['/api/flights', 'Proxied OpenSky Network — live aircraft states'],
          ['/api/satellites/active', 'Proxied CelesTrak — satellite TLE catalog'],
          ['/api/health', 'Server health check + cache status'],
        ],
      },
    ],
  },
];

export default function Onboarding({ onClose }) {
  const [page, setPage] = useState(0);
  const current = PAGES[page];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        width: 640, maxHeight: '85vh',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-glow)',
        borderRadius: 12,
        boxShadow: '0 0 60px rgba(0, 212, 255, 0.08), 0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(180deg, rgba(0,212,255,0.04) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                color: 'var(--accent-cyan)', letterSpacing: 3, marginBottom: 4,
              }}>
                {current.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
                letterSpacing: 2,
              }}>
                {current.subtitle}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid var(--border-color)',
              color: 'var(--text-dim)', cursor: 'pointer', padding: '4px 10px',
              borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1,
            }}>
              ESC
            </button>
          </div>

          {/* Page dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {PAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  width: i === page ? 24 : 8, height: 4, borderRadius: 2,
                  background: i === page ? 'var(--accent-cyan)' : 'var(--border-color)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 24px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {current.content.map((section, i) => (
            <div key={i}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              }}>
                {section.icon && (
                  <span style={{
                    fontSize: 16, width: 28, height: 28, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: `${section.color}15`, borderRadius: 6,
                    border: `1px solid ${section.color}30`,
                  }}>
                    {section.icon}
                  </span>
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                  color: section.color || 'var(--text-primary)', letterSpacing: 1,
                }}>
                  {section.heading}
                </span>
              </div>

              {section.text && (
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, marginBottom: section.source ? 6 : 0,
                }}>
                  {section.text}
                </div>
              )}

              {section.source && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
                  background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 4,
                  display: 'inline-block',
                }}>
                  SOURCE: {section.source}
                </div>
              )}

              {section.items && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  background: 'var(--bg-tertiary)', borderRadius: 6, padding: 10,
                }}>
                  {section.items.map(([key, val], j) => (
                    <div key={j} style={{
                      display: 'flex', gap: 12,
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                    }}>
                      <span style={{
                        color: 'var(--accent-cyan)', minWidth: 160, flexShrink: 0,
                      }}>
                        {key}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer navigation */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-secondary)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          }}>
            {page + 1} / {PAGES.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {page > 0 && (
              <button onClick={() => setPage(page - 1)} style={{
                background: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 16px',
                borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
              }}>
                BACK
              </button>
            )}
            {page < PAGES.length - 1 ? (
              <button onClick={() => setPage(page + 1)} style={{
                background: 'var(--accent-cyan)', border: 'none',
                color: '#0a0a0f', cursor: 'pointer', padding: '6px 20px',
                borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
                fontWeight: 700, letterSpacing: 1,
              }}>
                NEXT
              </button>
            ) : (
              <button onClick={onClose} style={{
                background: 'var(--accent-cyan)', border: 'none',
                color: '#0a0a0f', cursor: 'pointer', padding: '6px 20px',
                borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
                fontWeight: 700, letterSpacing: 1,
              }}>
                ENTER NORVIEW
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
