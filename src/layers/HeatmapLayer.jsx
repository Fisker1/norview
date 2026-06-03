import { useEffect, useRef, useMemo } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

/**
 * HeatmapLayer — Spatial Activity Density Overlay
 *
 * Inspired by Palantir Maven's multi-source density fusion and
 * Bilawal Sidhu's GODS EYE spatial intelligence hotspot mapping.
 * Aggregates all tracked entities (flights, vessels, satellites)
 * into a spatial grid and renders a color-coded density heatmap,
 * highlighting areas of concentrated or anomalous activity.
 *
 * Maven uses heatmaps across 150+ data sources to surface patterns;
 * GODS EYE overlays density to show "where the action is" in real-time.
 */

// Grid resolution (degrees per cell)
const CELL_SIZE = 2.0;

// Color ramp: blue (low) → cyan → yellow → orange → red (high)
const COLOR_RAMP = [
  { t: 0.0,  r: 0.0,  g: 0.2,  b: 0.8, a: 0.08 },
  { t: 0.15, r: 0.0,  g: 0.6,  b: 1.0, a: 0.14 },
  { t: 0.3,  r: 0.0,  g: 0.85, b: 0.9, a: 0.20 },
  { t: 0.5,  r: 0.3,  g: 0.95, b: 0.2, a: 0.28 },
  { t: 0.7,  r: 0.95, g: 0.85, b: 0.0, a: 0.35 },
  { t: 0.85, r: 1.0,  g: 0.5,  b: 0.0, a: 0.42 },
  { t: 1.0,  r: 1.0,  g: 0.1,  b: 0.1, a: 0.55 },
];

function lerpColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = COLOR_RAMP[0];
  let hi = COLOR_RAMP[COLOR_RAMP.length - 1];
  for (let i = 0; i < COLOR_RAMP.length - 1; i++) {
    if (clamped >= COLOR_RAMP[i].t && clamped <= COLOR_RAMP[i + 1].t) {
      lo = COLOR_RAMP[i];
      hi = COLOR_RAMP[i + 1];
      break;
    }
  }
  const range = hi.t - lo.t || 1;
  const f = (clamped - lo.t) / range;
  return new Cesium.Color(
    lo.r + (hi.r - lo.r) * f,
    lo.g + (hi.g - lo.g) * f,
    lo.b + (hi.b - lo.b) * f,
    lo.a + (hi.a - lo.a) * f
  );
}

function buildGrid(flights, vessels, satellites, bounds) {
  const cells = new Map();

  const addPoint = (lat, lon, weight) => {
    if (lat == null || lon == null) return;
    if (lat < bounds.minLat || lat > bounds.maxLat) return;
    if (lon < bounds.minLon || lon > bounds.maxLon) return;
    const row = Math.floor(lat / CELL_SIZE);
    const col = Math.floor(lon / CELL_SIZE);
    const key = row + ':' + col;
    if (!cells.has(key)) {
      cells.set(key, {
        row, col,
        lat: (row + 0.5) * CELL_SIZE,
        lon: (col + 0.5) * CELL_SIZE,
        count: 0,
        weight: 0,
        military: 0,
        anomaly: 0,
      });
    }
    const cell = cells.get(key);
    cell.count += 1;
    cell.weight += weight;
  };

  // Flights — military get extra weight
  (flights || []).forEach((f) => {
    if (f.onGround) return;
    const lat = f.lat || f.latitude;
    const lon = f.lon || f.longitude;
    const isMil = f.classification && f.classification.classification !== 'civilian';
    const w = isMil ? 3 : 1;
    addPoint(lat, lon, w);
    if (isMil) {
      const key = Math.floor(lat / CELL_SIZE) + ':' + Math.floor(lon / CELL_SIZE);
      const cell = cells.get(key);
      if (cell) cell.military += 1;
    }
  });

  // Vessels — anomalies and dark ships get extra weight
  (vessels || []).forEach((v) => {
    let w = 1;
    if (!v.aisActive) w += 2;
    if (v.anomalyScore >= 25) w += 1;
    if (v.anomalyScore >= 50) w += 2;
    if (v.type === 'military') w += 2;
    addPoint(v.lat, v.lon, w);
    if (v.anomalyScore >= 25) {
      const key = Math.floor(v.lat / CELL_SIZE) + ':' + Math.floor(v.lon / CELL_SIZE);
      const cell = cells.get(key);
      if (cell) cell.anomaly += 1;
    }
  });

  // Satellites — military satellites get extra weight
  (satellites || []).forEach((s) => {
    if (s.lat == null || s.lon == null) return;
    const isMil = s.type === 'military' || s.classification === 'military';
    addPoint(s.lat, s.lon, isMil ? 2 : 0.5);
  });

  return Array.from(cells.values());
}

export default function HeatmapLayer({ viewer }) {
  const flights = useStore((s) => s.flights);
  const vessels = useStore((s) => s.vessels);
  const satellites = useStore((s) => s.satellites);
  const bounds = useStore((s) => s.bounds);
  const layerVisible = useStore((s) => s.layers.heatmap);
  const dataSourceRef = useRef(null);

  // Build grid data
  const gridCells = useMemo(
    () => buildGrid(flights, vessels, satellites, bounds),
    [flights, vessels, satellites, bounds]
  );

  // Max weight for normalization
  const maxWeight = useMemo(() => {
    if (gridCells.length === 0) return 1;
    return Math.max(...gridCells.map((c) => c.weight), 1);
  }, [gridCells]);

  // Create datasource
  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('heatmap');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;
    return () => {
      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current, true);
      }
    };
  }, [viewer]);

  // Render heatmap entities
  useEffect(() => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    ds.entities.removeAll();

    if (!layerVisible || gridCells.length === 0) return;

    // Only show cells with meaningful density
    const threshold = maxWeight * 0.05;

    gridCells.forEach((cell) => {
      if (cell.weight < threshold) return;

      const intensity = cell.weight / maxWeight;
      const color = lerpColor(intensity);

      // Scale radius with intensity — hotter cells appear larger
      const baseRadius = CELL_SIZE * 55000;
      const radius = baseRadius * (0.6 + intensity * 0.6);

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat),
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: color,
          outline: false,
          height: 0,
          classificationType: Cesium.ClassificationType.BOTH,
        },
        properties: {
          type: 'heatmap',
          data: {
            count: cell.count,
            weight: cell.weight,
            military: cell.military,
            anomaly: cell.anomaly,
            intensity: Math.round(intensity * 100),
          },
        },
      });

      // Add glow ring for high-anomaly or high-military cells
      if (cell.anomaly >= 3 || cell.military >= 2) {
        const ringColor = cell.anomaly >= 3
          ? new Cesium.Color(1.0, 0.2, 0.2, 0.12)
          : new Cesium.Color(1.0, 0.6, 0.0, 0.10);

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat),
          ellipse: {
            semiMajorAxis: radius * 1.5,
            semiMinorAxis: radius * 1.5,
            material: ringColor,
            outline: true,
            outlineColor: cell.anomaly >= 3
              ? new Cesium.Color(1.0, 0.2, 0.2, 0.25)
              : new Cesium.Color(1.0, 0.6, 0.0, 0.20),
            outlineWidth: 1,
            height: 0,
            classificationType: Cesium.ClassificationType.BOTH,
          },
        });
      }
    });
  }, [gridCells, maxWeight, layerVisible]);

  return null;
}
