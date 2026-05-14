import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

const POLL_INTERVAL = 60000;

// Sensitive infrastructure — global set, filtered by region
const SENSITIVE_AREAS = [
  // Norway
  { name: 'Svalbard Subsea Cables', lat: 78.2, lon: 15.6, radius: 50, region: 'norway' },
  { name: 'Norwegian Oil Fields', lat: 61.5, lon: 3.5, radius: 80, region: 'norway' },
  { name: 'Tromsø Naval Base', lat: 69.65, lon: 18.95, radius: 20, region: 'norway' },
  { name: 'Bergen Naval Base', lat: 60.4, lon: 5.3, radius: 15, region: 'norway' },
  { name: 'North Sea Pipelines', lat: 58.5, lon: 2.5, radius: 60, region: 'norway' },
  { name: 'Andøya Rocket Range', lat: 69.3, lon: 16.0, radius: 30, region: 'norway' },
  { name: 'Vardø Radar Station', lat: 70.37, lon: 31.11, radius: 25, region: 'norway' },
  // Europe
  { name: 'Strait of Gibraltar', lat: 35.96, lon: -5.5, radius: 30, region: 'europe' },
  { name: 'Suez Canal Approach', lat: 31.3, lon: 32.3, radius: 40, region: 'europe' },
  { name: 'English Channel', lat: 50.9, lon: 1.3, radius: 50, region: 'europe' },
  { name: 'Bosphorus Strait', lat: 41.1, lon: 29.05, radius: 20, region: 'europe' },
  { name: 'Baltic Pipeline', lat: 55.5, lon: 15.0, radius: 60, region: 'europe' },
  { name: 'Sevastopol Naval Base', lat: 44.6, lon: 33.5, radius: 25, region: 'europe' },
  { name: 'Kaliningrad Naval Base', lat: 54.7, lon: 20.5, radius: 20, region: 'europe' },
  // Global
  { name: 'Strait of Hormuz', lat: 26.5, lon: 56.3, radius: 40, region: 'global' },
  { name: 'Strait of Malacca', lat: 2.5, lon: 101.5, radius: 50, region: 'global' },
  { name: 'Panama Canal', lat: 9.1, lon: -79.7, radius: 30, region: 'global' },
  { name: 'South China Sea', lat: 15.0, lon: 115.0, radius: 100, region: 'global' },
  { name: 'Taiwan Strait', lat: 24.5, lon: 119.0, radius: 40, region: 'global' },
  { name: 'Guam Naval Base', lat: 13.45, lon: 144.78, radius: 25, region: 'global' },
  { name: 'Diego Garcia', lat: -7.32, lon: 72.42, radius: 30, region: 'global' },
  { name: 'Cape of Good Hope', lat: -34.35, lon: 18.5, radius: 40, region: 'global' },
];

// Shipping routes by region
const ROUTES = {
  norway: [
    { name: 'North Sea Lane', latRange: [58, 62], lonRange: [2, 6], count: 25, types: ['cargo', 'tanker'] },
    { name: 'Coastal Route', latRange: [59, 71], lonRange: [5, 16], count: 30, types: ['cargo', 'fishing', 'passenger'] },
    { name: 'Barents Sea', latRange: [70, 76], lonRange: [15, 40], count: 15, types: ['cargo', 'tanker', 'research'] },
    { name: 'Svalbard', latRange: [76, 80], lonRange: [10, 25], count: 8, types: ['research', 'fishing', 'cruise'] },
    { name: 'Oil Fields', latRange: [58, 66], lonRange: [1, 8], count: 12, types: ['supply', 'tanker'] },
  ],
  europe: [
    { name: 'English Channel', latRange: [49, 51], lonRange: [-3, 3], count: 35, types: ['cargo', 'tanker', 'passenger'] },
    { name: 'Baltic Sea', latRange: [54, 60], lonRange: [12, 28], count: 30, types: ['cargo', 'tanker'] },
    { name: 'Mediterranean W', latRange: [36, 42], lonRange: [-2, 10], count: 25, types: ['cargo', 'tanker', 'cruise'] },
    { name: 'Mediterranean E', latRange: [33, 38], lonRange: [15, 35], count: 20, types: ['cargo', 'tanker', 'military'] },
    { name: 'Black Sea', latRange: [42, 46], lonRange: [28, 40], count: 15, types: ['cargo', 'tanker', 'military'] },
    { name: 'Atlantic/Biscay', latRange: [43, 50], lonRange: [-10, -2], count: 18, types: ['cargo', 'fishing', 'tanker'] },
    { name: 'Gibraltar Strait', latRange: [35, 37], lonRange: [-6, -4], count: 20, types: ['cargo', 'tanker'] },
    { name: 'North Sea', latRange: [52, 58], lonRange: [-2, 8], count: 25, types: ['cargo', 'tanker', 'supply'] },
  ],
  global: [
    { name: 'Strait of Hormuz', latRange: [25, 28], lonRange: [54, 58], count: 20, types: ['tanker'] },
    { name: 'Indian Ocean', latRange: [-5, 15], lonRange: [55, 80], count: 25, types: ['cargo', 'tanker'] },
    { name: 'South China Sea', latRange: [5, 20], lonRange: [108, 120], count: 30, types: ['cargo', 'tanker', 'military'] },
    { name: 'Malacca Strait', latRange: [0, 5], lonRange: [99, 105], count: 22, types: ['cargo', 'tanker'] },
    { name: 'East China Sea', latRange: [25, 35], lonRange: [120, 130], count: 18, types: ['cargo', 'fishing', 'military'] },
    { name: 'Gulf of Aden', latRange: [11, 15], lonRange: [43, 50], count: 15, types: ['cargo', 'tanker', 'military'] },
    { name: 'Panama Approach', latRange: [7, 12], lonRange: [-82, -77], count: 12, types: ['cargo', 'tanker'] },
    { name: 'US East Coast', latRange: [30, 42], lonRange: [-78, -70], count: 20, types: ['cargo', 'tanker', 'cruise'] },
    { name: 'Cape Route', latRange: [-35, -28], lonRange: [15, 30], count: 10, types: ['cargo', 'tanker'] },
    { name: 'Pacific Central', latRange: [15, 35], lonRange: [-160, -130], count: 12, types: ['cargo', 'tanker'] },
  ],
};

const FLAGS = ['NO', 'RU', 'GB', 'DE', 'DK', 'SE', 'NL', 'PA', 'LR', 'MH', 'CN', 'US', 'GR', 'JP', 'KR', 'SG', 'TR', 'IT', 'FR', 'IR'];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeAnomalyScore(vessel) {
  let score = 0;
  const reasons = [];

  if (!vessel.aisActive) { score += 40; reasons.push('AIS TRANSPONDER OFF'); }
  if (vessel.speed < 1.5 && vessel.status === 'underway') { score += 15; reasons.push('POSSIBLE LOITERING'); }

  for (const area of SENSITIVE_AREAS) {
    const dist = haversineKm(vessel.lat, vessel.lon, area.lat, area.lon);
    if (dist < area.radius) {
      score += 25;
      reasons.push(`NEAR ${area.name.toUpperCase()}`);
      vessel.nearSensitive = area.name;
      break;
    }
  }

  if (vessel.flag === 'RU' && vessel.lat > 70) { score += 10; reasons.push('RU FLAG IN HIGH NORTH'); }
  if (vessel.flag === 'IR' && vessel.type === 'tanker') { score += 15; reasons.push('IR FLAG TANKER'); }
  if (vessel.flag === 'CN' && vessel.type === 'research') { score += 10; reasons.push('CN RESEARCH VESSEL'); }
  if (vessel.type === 'fishing' && vessel.speed > 14) { score += 10; reasons.push('EXCESSIVE SPEED FOR TYPE'); }
  if (vessel.type === 'military') { score += 20; reasons.push('MILITARY VESSEL'); }

  return { score: Math.min(score, 100), reasons };
}

function generateVessels(regionKey) {
  // Accumulate routes: always include norway, add europe/global as needed
  let routes = [...ROUTES.norway];
  if (regionKey === 'europe' || regionKey === 'global') routes = [...routes, ...ROUTES.europe];
  if (regionKey === 'global') routes = [...routes, ...ROUTES.global];

  const vessels = [];
  let mmsi = 257000000;

  routes.forEach((route) => {
    for (let i = 0; i < route.count; i++) {
      const type = route.types[Math.floor(Math.random() * route.types.length)];
      const lat = route.latRange[0] + Math.random() * (route.latRange[1] - route.latRange[0]);
      const lon = route.lonRange[0] + Math.random() * (route.lonRange[1] - route.lonRange[0]);
      const flag = FLAGS[Math.floor(Math.random() * FLAGS.length)];
      const speed = type === 'tanker' ? 8 + Math.random() * 6 :
                    type === 'cargo' ? 10 + Math.random() * 8 :
                    type === 'fishing' ? 2 + Math.random() * 6 :
                    type === 'military' ? 12 + Math.random() * 8 : 6 + Math.random() * 12;

      const aisActive = type === 'military' ? Math.random() > 0.3 : Math.random() > 0.06;

      const vessel = {
        mmsi: mmsi++,
        name: `${type.toUpperCase()}-${route.name.split(' ')[0].toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
        type, lat, lon,
        speed: Math.round(speed * 10) / 10,
        heading: Math.round(Math.random() * 360),
        flag, route: route.name,
        status: Math.random() > 0.05 ? 'underway' : 'anchored',
        aisActive,
      };

      if (type === 'fishing' && Math.random() > 0.7) vessel.speed = 0.5 + Math.random() * 1.0;

      const anomaly = computeAnomalyScore(vessel);
      vessel.anomalyScore = anomaly.score;
      vessel.anomalyReasons = anomaly.reasons;

      vessels.push(vessel);
    }
  });

  return vessels;
}

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

export default function VesselLayer({ viewer }) {
  const setVessels = useStore((s) => s.setVessels);
  const setStats = useStore((s) => s.setStats);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const addAlert = useStore((s) => s.addAlert);
  const addTimelineEvent = useStore((s) => s.addTimelineEvent);
  const region = useStore((s) => s.region);
  const dataSourceRef = useRef(null);
  const intervalRef = useRef(null);

  // Setup datasource once
  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('vessels');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'vessel') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'vessel', name: d.name,
            color: getVesselColor(d), id: d.mmsi,
            details: {
              mmsi: d.mmsi, type: d.type, flag: d.flag,
              speed: `${d.speed} kts`, heading: `${d.heading}°`,
              route: d.route, status: d.status,
              ais: d.aisActive ? 'ACTIVE' : '⚠ DARK',
              'anomaly score': `${d.anomalyScore}/100`,
              ...(d.anomalyReasons.length > 0 && { alerts: d.anomalyReasons.join(', ') }),
              ...(d.nearSensitive && { 'near infra': d.nearSensitive }),
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

  // Regenerate vessels when region changes
  useEffect(() => {
    if (!dataSourceRef.current) return;
    const ds = dataSourceRef.current;

    const render = () => {
      ds.entities.removeAll();
      const vessels = generateVessels(region);

      vessels.forEach((v) => {
        const color = getVesselColor(v);
        const isAnomaly = v.anomalyScore >= 25;

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(v.lon, v.lat, 0),
          point: {
            pixelSize: isAnomaly ? 7 : 5,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(isAnomaly ? 0.4 : 0.2),
            outlineWidth: isAnomaly ? 12 : 6,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: isAnomaly ? `⚠ ${v.name} [${v.anomalyScore}]` : v.name,
            font: '9px JetBrains Mono',
            fillColor: Cesium.Color.fromCssColorString(color).withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(10, -4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 0.8,
            distanceDisplayCondition: isAnomaly
              ? new Cesium.DistanceDisplayCondition(0, 5000000)
              : new Cesium.DistanceDisplayCondition(0, 1500000),
          },
          properties: { type: 'vessel', data: v },
        });
      });

      if (addAlert) {
        vessels.filter((v) => v.anomalyScore >= 40).slice(0, 5).forEach((v) => {
          addAlert({
            type: 'vessel-anomaly',
            severity: v.anomalyScore >= 60 ? 'critical' : 'warning',
            title: `VESSEL ANOMALY — ${v.name}`,
            message: v.anomalyReasons.join(' | '),
            timestamp: new Date(),
          });
        });
      }

      if (addTimelineEvent) {
        addTimelineEvent({
          timestamp: new Date(), type: 'vessels',
          data: { total: vessels.length, anomalies: vessels.filter((v) => v.anomalyScore >= 25).length, dark: vessels.filter((v) => !v.aisActive).length },
        });
      }

      setVessels(vessels);
      setStats({
        vessels: vessels.length,
        darkVessels: vessels.filter((v) => !v.aisActive).length,
        vesselAnomalies: vessels.filter((v) => v.anomalyScore >= 25).length,
        lastUpdate: new Date(),
      });
    };

    render();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(render, POLL_INTERVAL);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [region]);

  return null;
}
