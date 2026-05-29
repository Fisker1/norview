import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

const POLL_INTERVAL = 30000;

// SIGINT / Electronic Warfare detection points (Maven + GODS EYE feature)
// In production: fed by SDR arrays, RF sensors, ELINT receivers, and partner intel feeds
const SIGNAL_SOURCES = [
  // === NORWAY ===
  { id: 'sig-vardo', name: 'Vard\u00f8 GLOBUS', lat: 70.37, lon: 31.11, type: 'radar', desc: 'GLOBUS II/III radar \u2014 space surveillance & early warning', power: 'HIGH', scope: 'norway' },
  { id: 'sig-andoya', name: 'And\u00f8ya SIGINT', lat: 69.30, lon: 16.03, type: 'sigint', desc: 'Norwegian Intelligence Service \u2014 signal collection', power: 'MEDIUM', scope: 'norway' },
  { id: 'sig-flesland', name: 'Flesland MPA', lat: 60.29, lon: 5.23, type: 'comint', desc: 'Maritime patrol aircraft comms relay', power: 'LOW', scope: 'norway' },
  { id: 'sig-banak', name: 'Banak QRA', lat: 70.07, lon: 25.04, type: 'radar', desc: 'Quick Reaction Alert radar \u2014 Finnmark', power: 'HIGH', scope: 'norway' },
  { id: 'sig-svalbard', name: 'SvalSat Intercept', lat: 78.23, lon: 15.41, type: 'sigint', desc: 'Satellite downlink intercept station', power: 'MEDIUM', scope: 'norway' },
  { id: 'sig-marjata', name: 'Marjata ELINT', lat: 70.60, lon: 31.05, type: 'elint', desc: 'Intelligence vessel Marjata \u2014 electronic surveillance', power: 'HIGH', scope: 'norway' },
  { id: 'sig-rost', name: 'R\u00f8st RF Monitor', lat: 67.52, lon: 12.10, type: 'rf-anomaly', desc: 'Anomalous RF burst detected \u2014 unidentified source', power: 'LOW', scope: 'norway' },
  { id: 'sig-hammerfest', name: 'Hammerfest Comms', lat: 70.66, lon: 23.68, type: 'comint', desc: 'HF/VHF military comms intercept', power: 'MEDIUM', scope: 'norway' },
  // === EUROPE ===
  { id: 'sig-ramstein', name: 'Ramstein SIGINT', lat: 49.44, lon: 7.60, type: 'sigint', desc: 'US/NATO signal intelligence hub', power: 'HIGH', scope: 'europe' },
  { id: 'sig-kaliningrad-ew', name: 'Kaliningrad EW', lat: 54.70, lon: 20.50, type: 'ew-jamming', desc: 'Russian electronic warfare emissions detected', power: 'HIGH', scope: 'europe' },
  { id: 'sig-baltic-patrol', name: 'Baltic ELINT', lat: 57.00, lon: 20.00, type: 'elint', desc: 'NATO ELINT collection \u2014 Baltic Sea', power: 'MEDIUM', scope: 'europe' },
  { id: 'sig-murmansk-radar', name: 'Murmansk Radar', lat: 68.97, lon: 33.07, type: 'radar', desc: 'Russian Northern Fleet radar emissions', power: 'HIGH', scope: 'europe' },
  { id: 'sig-cyprus-gchq', name: 'Cyprus SIGINT', lat: 34.59, lon: 32.98, type: 'sigint', desc: 'UK GCHQ \u2014 Eastern Mediterranean collection', power: 'HIGH', scope: 'europe' },
  // === GLOBAL ===
  { id: 'sig-hormuz-ew', name: 'Hormuz EW', lat: 26.50, lon: 56.30, type: 'ew-jamming', desc: 'Iranian GPS spoofing & EW detected', power: 'HIGH', scope: 'global' },
  { id: 'sig-taiwan-radar', name: 'Taiwan Strait Radar', lat: 24.50, lon: 118.50, type: 'radar', desc: 'PLA radar emissions \u2014 Taiwan ADIZ', power: 'HIGH', scope: 'global' },
  { id: 'sig-diego-garcia', name: 'Diego Garcia SIGINT', lat: -7.32, lon: 72.42, type: 'sigint', desc: 'US/UK joint SIGINT facility', power: 'HIGH', scope: 'global' },
  { id: 'sig-pyongyang-radar', name: 'DPRK Air Defense', lat: 39.02, lon: 125.75, type: 'radar', desc: 'North Korean air defense radar emissions', power: 'MEDIUM', scope: 'global' },
];

const SIGNAL_TYPE_CONFIG = {
  'radar':      { color: '#ef4444', label: 'RADAR' },
  'sigint':     { color: '#a855f7', label: 'SIGINT' },
  'elint':      { color: '#6366f1', label: 'ELINT' },
  'comint':     { color: '#3b82f6', label: 'COMINT' },
  'ew-jamming': { color: '#f43f5e', label: 'EW/JAM' },
  'rf-anomaly': { color: '#f59e0b', label: 'RF-ANOM' },
};

function getVisibleSignals(regionKey) {
  if (regionKey === 'global') return SIGNAL_SOURCES;
  if (regionKey === 'europe') return SIGNAL_SOURCES.filter((s) => s.scope === 'norway' || s.scope === 'europe');
  return SIGNAL_SOURCES.filter((s) => s.scope === 'norway');
}

function simulateSignalStrength() {
  return (Math.random() * 40 + 60).toFixed(0);
}

function simulateFrequency(type) {
  const ranges = {
    'radar': () => (Math.random() * 12 + 2).toFixed(2) + ' GHz',
    'sigint': () => (Math.random() * 400 + 100).toFixed(0) + ' MHz',
    'elint': () => (Math.random() * 8 + 1).toFixed(2) + ' GHz',
    'comint': () => (Math.random() * 300 + 30).toFixed(0) + ' MHz',
    'ew-jamming': () => (Math.random() * 5 + 1).toFixed(2) + ' GHz',
    'rf-anomaly': () => (Math.random() * 1000 + 50).toFixed(0) + ' MHz',
  };
  return (ranges[type] || ranges['sigint'])();
}

export default function SignalLayer({ viewer }) {
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const addAlert = useStore((s) => s.addAlert);
  const region = useStore((s) => s.region);
  const dataSourceRef = useRef(null);
  const intervalRef = useRef(null);

  const renderSignals = useCallback((ds, regionKey) => {
    ds.entities.removeAll();
    const signals = getVisibleSignals(regionKey);
    const now = new Date();

    signals.forEach((sig) => {
      const cfg = SIGNAL_TYPE_CONFIG[sig.type] || SIGNAL_TYPE_CONFIG['sigint'];
      const strength = simulateSignalStrength();
      const freq = simulateFrequency(sig.type);
      const isActive = Math.random() > 0.15;
      const ringSize = sig.power === 'HIGH' ? 14 : sig.power === 'MEDIUM' ? 10 : 7;

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(sig.lon, sig.lat, 1000),
        point: {
          pixelSize: ringSize,
          color: Cesium.Color.fromCssColorString(cfg.color).withAlpha(isActive ? 0.9 : 0.3),
          outlineColor: Cesium.Color.fromCssColorString(cfg.color).withAlpha(isActive ? 0.4 : 0.1),
          outlineWidth: isActive ? 18 : 6,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: cfg.label + ' ' + strength + 'dBm',
          font: '9px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString(cfg.color),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(16, -4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 0.85,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4000000),
        },
        properties: {
          type: 'signal',
          data: {
            ...sig,
            strength: strength + ' dBm',
            frequency: freq,
            active: isActive,
            lastDetected: now.toISOString(),
            classification: cfg.label,
          },
        },
      });
    });

    // Alerts for EW/jamming detections
    if (addAlert) {
      signals
        .filter((s) => s.type === 'ew-jamming' || s.type === 'rf-anomaly')
        .slice(0, 1)
        .forEach((s) => {
          if (Math.random() > 0.7) {
            addAlert({
              type: 'sigint-detection',
              severity: s.type === 'ew-jamming' ? 'critical' : 'warning',
              title: 'SIGINT \u2014 ' + s.name,
              message: SIGNAL_TYPE_CONFIG[s.type].label + ' emission detected. Strength: ' + simulateSignalStrength() + 'dBm. Source: ' + s.desc,
              timestamp: new Date(),
            });
          }
        });
    }
  }, [addAlert]);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('signals');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'signal') {
          const d = props.data.getValue();
          const cfg = SIGNAL_TYPE_CONFIG[d.type] || SIGNAL_TYPE_CONFIG['sigint'];
          setSelectedEntity({
            type: 'signal',
            name: 'SIGINT \u2014 ' + d.name,
            color: cfg.color,
            id: d.id,
            details: {
              classification: d.classification,
              'signal type': d.type.replace(/-/g, ' ').toUpperCase(),
              status: d.active ? '\u25cf ACTIVE' : '\u25cb INACTIVE',
              'signal strength': d.strength,
              frequency: d.frequency,
              'power level': d.power,
              'last detected': new Date(d.lastDetected).toLocaleTimeString(),
              description: d.desc,
            },
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (dataSourceRef.current) viewer.dataSources.remove(dataSourceRef.current, true);
    };
  }, [viewer]);

  useEffect(() => {
    if (!dataSourceRef.current) return;
    const ds = dataSourceRef.current;

    renderSignals(ds, region);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => renderSignals(ds, region), POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [region, renderSignals]);

  return null;
}
