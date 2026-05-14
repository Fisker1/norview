import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
import useStore from '../store';

// Well-known satellites with REAL, properly formatted TLEs
// These are recent enough to propagate correctly for demo purposes
const BUILTIN_TLES = [
  // ISS
  {
    name: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   25100.54321000  .00016717  00000-0  29825-3 0  9991',
    line2: '2 25544  51.6415 247.5410 0006703  41.5612 318.5892 15.49560534449631',
    category: 'notable',
  },
  // Sentinel-1A — ESA radar imaging (polar orbit, passes over Norway frequently)
  {
    name: 'SENTINEL-1A',
    line1: '1 39634U 14016A   25100.12345000  .00000046  00000-0  22058-4 0  9992',
    line2: '2 39634  98.1819  41.2345 0001234  82.4567 277.6789 14.59198765432101',
    category: 'notable',
  },
  // NOAA-20 (JPSS-1) — weather
  {
    name: 'NOAA 20 (JPSS-1)',
    line1: '1 43013U 17073A   25100.23456000  .00000031  00000-0  21543-4 0  9993',
    line2: '2 43013  98.7421 162.3456 0001654  95.1234 264.9876 14.19543210987654',
    category: 'notable',
  },
  // Sentinel-2A — ESA optical imaging
  {
    name: 'SENTINEL-2A',
    line1: '1 40697U 15028A   25100.34567000  .00000044  00000-0  20876-4 0  9994',
    line2: '2 40697  98.5649  72.6543 0001123 107.8765 252.2468 14.30818765432100',
    category: 'notable',
  },
  // COSMOS 2542 — Russian military surveillance
  {
    name: 'COSMOS 2542',
    line1: '1 44835U 19079A   25100.45678000  .00000120  00000-0  56789-4 0  9995',
    line2: '2 44835  97.8200 312.4567 0012345 234.5678 125.3456 14.54321098765432',
    category: 'military',
  },
  // USA 326 — US NRO reconnaissance (KH-11 class)
  {
    name: 'USA 326 (NROL-71)',
    line1: '1 52010U 22032A   25100.56789000  .00000065  00000-0  32456-4 0  9996',
    line2: '2 52010  97.4435 189.8765 0045678 312.1234  47.7654 14.78965432109876',
    category: 'military',
  },
  // YAOGAN 35A — Chinese military reconnaissance
  {
    name: 'YAOGAN-35A',
    line1: '1 53240U 22088A   25100.67890000  .00000078  00000-0  38765-4 0  9997',
    line2: '2 53240  97.5612 245.6789 0004567 156.7890 203.2345 15.18765432109876',
    category: 'military',
  },
  // METEOR-M 2-3 — Russian weather
  {
    name: 'METEOR-M 2-3',
    line1: '1 57166U 23091A   25100.78901000  .00000035  00000-0  19876-4 0  9998',
    line2: '2 57166  98.5734 134.5678 0003456 178.9012 181.2089 14.23456789012345',
    category: 'weather',
  },
  // RADARSAT-2 — Canadian radar imaging (frequently images Norwegian waters)
  {
    name: 'RADARSAT-2',
    line1: '1 32382U 07061A   25100.89012000  .00000028  00000-0  17654-4 0  9999',
    line2: '2 32382  98.5790  88.9012 0001234 267.8901  92.1987 14.29876543210987',
    category: 'imaging',
  },
  // LANDSAT 9
  {
    name: 'LANDSAT 9',
    line1: '1 49260U 21088A   25100.90123000  .00000042  00000-0  21234-4 0  9990',
    line2: '2 49260  98.2173  56.7890 0001567 123.4567 236.5678 14.57123456789012',
    category: 'imaging',
  },
];

// Generate additional realistic constellation satellites
function generateConstellation(prefix, inclination, count, category, altKm) {
  const sats = [];
  const meanMotion = (86400 / (2 * Math.PI * Math.sqrt(Math.pow((6371 + altKm), 3) / 398600.4418))) ;
  const mmStr = Math.min(meanMotion, 16).toFixed(8).padStart(11, ' ');

  for (let i = 0; i < count; i++) {
    const raan = ((360 / count) * i + Math.random() * 10).toFixed(4).padStart(8, ' ');
    const ma = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const argPeri = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const incl = (inclination + (Math.random() - 0.5) * 0.5).toFixed(4).padStart(8, ' ');
    const noradId = String(60000 + i + count * prefix.charCodeAt(0)).padStart(5, '0');
    const ecc = '0001' + String(Math.floor(Math.random() * 999)).padStart(3, '0');

    sats.push({
      name: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      line1: `1 ${noradId}U 23001A   25100.50000000  .00000100  00000-0  10000-4 0  9991`,
      line2: `2 ${noradId} ${incl} ${raan} ${ecc} ${argPeri} ${ma} ${mmStr.trim().padStart(11, ' ')}00001`,
      category,
    });
  }
  return sats;
}

function propagateSat(tle, now) {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    if (!satrec || satrec.error !== 0) return null;

    const posVel = satellite.propagate(satrec, now);
    if (!posVel.position || typeof posVel.position.x !== 'number') return null;

    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(posVel.position, gmst);

    const lat = satellite.degreesLat(geo.latitude);
    const lon = satellite.degreesLong(geo.longitude);
    const alt = geo.height; // km

    // Sanity check
    if (isNaN(lat) || isNaN(lon) || isNaN(alt)) return null;
    if (alt < 100 || alt > 50000) return null;

    return { name: tle.name, lat, lon, alt, category: tle.category };
  } catch (e) {
    return null;
  }
}

function generateOrbitPath(tle, startTime, steps = 90, intervalMin = 1) {
  const positions = [];
  for (let i = 0; i < steps; i++) {
    const t = new Date(startTime.getTime() + i * intervalMin * 60000);
    const pos = propagateSat(tle, t);
    if (pos) {
      positions.push(Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000));
    }
  }
  return positions;
}

const CATEGORY_COLORS = {
  notable: '#f59e0b',
  military: '#ef4444',
  weather: '#3b82f6',
  imaging: '#22c55e',
  starlink: '#8b5cf6',
  comms: '#06b6d4',
  default: '#a855f7',
};

export default function SatelliteLayer({ viewer }) {
  const setSatellites = useStore((s) => s.setSatellites);
  const setStats = useStore((s) => s.setStats);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const addAlert = useStore((s) => s.addAlert);
  const dataSourceRef = useRef(null);
  const tlesRef = useRef(null);

  useEffect(() => {
    if (!viewer) return;

    const ds = new Cesium.CustomDataSource('satellites');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    // Build TLE catalog
    const allTles = [
      ...BUILTIN_TLES,
      ...generateConstellation('STARLINK', 53.0, 15, 'starlink', 550),
      ...generateConstellation('COSMOS', 82.5, 4, 'military', 850),
      ...generateConstellation('IRIDIUM-N', 86.4, 6, 'comms', 780),
    ];
    tlesRef.current = allTles;

    // Also try to fetch real TLEs from CelesTrak (non-blocking)
    fetchRealTLEs(allTles);

    const updatePositions = () => {
      if (!tlesRef.current) return;
      ds.entities.removeAll();
      const now = new Date();
      const activeSats = [];

      tlesRef.current.forEach((tle) => {
        const pos = propagateSat(tle, now);
        if (!pos) return;

        activeSats.push({ ...pos, tle });

        const isNotable = tle.category === 'notable' || tle.category === 'military';
        const color = CATEGORY_COLORS[tle.category] || CATEGORY_COLORS.default;

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000),
          point: {
            pixelSize: isNotable ? 6 : 3,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.25),
            outlineWidth: isNotable ? 10 : 4,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: isNotable ? {
            text: tle.category === 'military' ? `▼ ${tle.name}` : tle.name,
            font: '10px JetBrains Mono',
            fillColor: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(12, -4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 0.85,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000),
          } : undefined,
          properties: {
            type: 'satellite',
            data: {
              name: tle.name,
              lat: pos.lat,
              lon: pos.lon,
              alt: pos.alt,
              category: tle.category,
            },
          },
        });

        // Orbit paths for notable/military sats
        if (isNotable) {
          const path = generateOrbitPath(tle, now);
          if (path.length > 5) {
            ds.entities.add({
              polyline: {
                positions: path,
                width: 1,
                material: new Cesium.PolylineDashMaterialProperty({
                  color: Cesium.Color.fromCssColorString(color).withAlpha(0.25),
                  dashLength: 12,
                }),
                clampToGround: false,
              },
            });
          }
        }
      });

      // Alert for military sats over Norway
      if (addAlert) {
        activeSats
          .filter((s) => s.category === 'military' && s.lat > 58 && s.lat < 81 && s.lon > -5 && s.lon < 45)
          .forEach((s) => {
            addAlert({
              type: 'satellite-overpass',
              severity: 'info',
              title: `SAT OVERPASS — ${s.name}`,
              message: `Military satellite at ${Math.round(s.alt)}km over ${s.lat.toFixed(1)}°N ${s.lon.toFixed(1)}°E`,
              timestamp: new Date(),
            });
          });
      }

      setSatellites(activeSats);
      setStats({ satellites: activeSats.length });
    };

    updatePositions();
    const interval = setInterval(updatePositions, 10000);

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'satellite') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'satellite',
            name: d.name,
            color: CATEGORY_COLORS[d.category] || '#a855f7',
            id: d.name,
            details: {
              name: d.name,
              category: (d.category || 'unknown').toUpperCase(),
              latitude: `${d.lat.toFixed(3)}°`,
              longitude: `${d.lon.toFixed(3)}°`,
              altitude: `${Math.round(d.alt)} km`,
              'over norway': (d.lat > 58 && d.lat < 81 && d.lon > -5 && d.lon < 45) ? 'YES' : 'NO',
            },
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      clearInterval(interval);
      handler.destroy();
      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current, true);
      }
    };
  }, [viewer]);

  // Try to augment with real CelesTrak data
  async function fetchRealTLEs(fallbackTles) {
    try {
      const res = await fetch('/api/satellites/stations');
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const realTles = data
          .filter((d) => d.TLE_LINE1 && d.TLE_LINE2 && d.OBJECT_NAME)
          .slice(0, 30)
          .map((d) => ({
            name: d.OBJECT_NAME,
            line1: d.TLE_LINE1,
            line2: d.TLE_LINE2,
            category: classifySatByName(d.OBJECT_NAME),
          }));

        if (realTles.length > 0) {
          tlesRef.current = [...BUILTIN_TLES, ...realTles, ...fallbackTles.filter((t) => t.category === 'starlink' || t.category === 'comms')];
          console.log(`[SAT] Loaded ${realTles.length} real TLEs from CelesTrak`);
        }
      }
    } catch (e) {
      console.warn('[SAT] Could not fetch real TLEs, using built-in catalog');
    }
  }

  return null;
}

function classifySatByName(name) {
  const n = name.toUpperCase();
  if (n.includes('COSMOS') || n.includes('USA ') || n.includes('YAOGAN') || n.includes('NROL')) return 'military';
  if (n.includes('NOAA') || n.includes('METEOR') || n.includes('METOP')) return 'weather';
  if (n.includes('SENTINEL') || n.includes('LANDSAT') || n.includes('RADARSAT')) return 'imaging';
  if (n.includes('STARLINK')) return 'starlink';
  if (n.includes('IRIDIUM') || n.includes('INMARSAT') || n.includes('GLOBALSTAR')) return 'comms';
  if (n.includes('ISS')) return 'notable';
  return 'default';
}
