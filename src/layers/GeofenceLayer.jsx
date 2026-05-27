import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

const GEOFENCE_ZONES = [
  {
    id: 'gf-vardoe', name: 'Vardoe Radar Buffer', priority: 'HIGH',
    description: 'Surveillance zone around Vardoe Globus II radar - monitors Russian ICBM activity',
    polygon: [[29.0, 70.0], [32.0, 70.0], [32.0, 71.5], [29.0, 71.5]],
    scope: 'norway',
  },
  {
    id: 'gf-svalbard-approach', name: 'Svalbard Approach', priority: 'CRITICAL',
    description: 'Northern maritime approach to Svalbard - submarine and vessel monitoring',
    polygon: [[8.0, 76.0], [22.0, 76.0], [22.0, 80.0], [8.0, 80.0]],
    scope: 'norway',
  },
  {
    id: 'gf-giuk-gap', name: 'GIUK Gap Monitor', priority: 'HIGH',
    description: 'Greenland-Iceland-UK gap - critical NATO chokepoint for submarine detection',
    polygon: [[-25.0, 60.0], [-5.0, 60.0], [-5.0, 67.0], [-25.0, 67.0]],
    scope: 'norway',
  },
  {
    id: 'gf-north-cape', name: 'North Cape Passage', priority: 'MEDIUM',
    description: 'Northern Sea Route western entry - commercial and military traffic monitoring',
    polygon: [[24.0, 70.5], [30.0, 70.5], [30.0, 72.0], [24.0, 72.0]],
    scope: 'norway',
  },
  {
    id: 'gf-tromso-corridor', name: 'Tromso Air Corridor', priority: 'MEDIUM',
    description: 'Air approach corridor to Tromso - NATO northern base operations',
    polygon: [[17.0, 69.0], [21.0, 69.0], [21.0, 70.5], [17.0, 70.5]],
    scope: 'norway',
  },
  {
    id: 'gf-baltic-entry', name: 'Baltic Entry Point', priority: 'HIGH',
    description: 'Danish Straits - all Baltic maritime traffic funnels through here',
    polygon: [[10.0, 54.5], [13.5, 54.5], [13.5, 58.0], [10.0, 58.0]],
    scope: 'europe',
  },
  {
    id: 'gf-suwalki-gap', name: 'Suwalki Gap Watch', priority: 'CRITICAL',
    description: 'NATO vulnerable corridor between Kaliningrad and Belarus',
    polygon: [[22.5, 53.5], [24.5, 53.5], [24.5, 55.0], [22.5, 55.0]],
    scope: 'europe',
  },
  {
    id: 'gf-hormuz', name: 'Strait of Hormuz', priority: 'CRITICAL',
    description: 'Most critical oil chokepoint - 21 percent of global petroleum',
    polygon: [[54.5, 25.5], [57.5, 25.5], [57.5, 27.0], [54.5, 27.0]],
    scope: 'global',
  },
  {
    id: 'gf-taiwan-strait', name: 'Taiwan Strait Watch', priority: 'CRITICAL',
    description: 'Cross-strait monitoring - PLA military activity detection',
    polygon: [[118.0, 23.0], [120.5, 23.0], [120.5, 26.0], [118.0, 26.0]],
    scope: 'global',
  },
  {
    id: 'gf-bab-el-mandeb', name: 'Bab el-Mandeb', priority: 'HIGH',
    description: 'Red Sea southern chokepoint - Houthi threat monitoring',
    polygon: [[42.5, 12.0], [44.5, 12.0], [44.5, 13.5], [42.5, 13.5]],
    scope: 'global',
  },
];

const PRIORITY_COLORS = {
  CRITICAL: { fill: 'rgba(239, 68, 68, 0.06)', stroke: 'rgba(239, 68, 68, 0.60)', glow: '#ef4444' },
  HIGH: { fill: 'rgba(245, 158, 11, 0.05)', stroke: 'rgba(245, 158, 11, 0.50)', glow: '#f59e0b' },
  MEDIUM: { fill: 'rgba(59, 130, 246, 0.04)', stroke: 'rgba(59, 130, 246, 0.40)', glow: '#3b82f6' },
  LOW: { fill: 'rgba(34, 197, 94, 0.04)', stroke: 'rgba(34, 197, 94, 0.35)', glow: '#22c55e' },
};

function getVisibleGeofences(regionKey) {
  if (regionKey === 'global') return GEOFENCE_ZONES;
  if (regionKey === 'europe') return GEOFENCE_ZONES.filter((z) => z.scope === 'norway' || z.scope === 'europe');
  return GEOFENCE_ZONES.filter((z) => z.scope === 'norway');
}

function isInsideZone(lat, lon, polygon) {
  const lons = polygon.map((p) => p[0]);
  const lats = polygon.map((p) => p[1]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

export { GEOFENCE_ZONES, PRIORITY_COLORS, getVisibleGeofences, isInsideZone };

export default function GeofenceLayer({ viewer }) {
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const region = useStore((s) => s.region);
  const layers = useStore((s) => s.layers);
  const flights = useStore((s) => s.flights);
  const vessels = useStore((s) => s.vessels);
  const satellites = useStore((s) => s.satellites);
  const setGeofenceStats = useStore((s) => s.setGeofenceStats);
  const addAlert = useStore((s) => s.addAlert);
  const dataSourceRef = useRef(null);
  const prevCountsRef = useRef({});

  useEffect(() => {
    const zones = getVisibleGeofences(region);
    const stats = {};
    zones.forEach((zone) => {
      let flightCount = 0, vesselCount = 0, satCount = 0;
      (flights || []).forEach((f) => {
        if (f.lat && f.lon && isInsideZone(f.lat, f.lon, zone.polygon)) flightCount++;
      });
      (vessels || []).forEach((v) => {
        if (v.lat && v.lon && isInsideZone(v.lat, v.lon, zone.polygon)) vesselCount++;
      });
      (satellites || []).forEach((s) => {
        if (s.lat && s.lon && isInsideZone(s.lat, s.lon, zone.polygon)) satCount++;
      });
      const total = flightCount + vesselCount + satCount;
      stats[zone.id] = { flights: flightCount, vessels: vesselCount, satellites: satCount, total };
      const prevTotal = prevCountsRef.current[zone.id] || 0;
      if (total > prevTotal && prevTotal > 0 && (zone.priority === 'CRITICAL' || zone.priority === 'HIGH')) {
        addAlert({
          id: 'gf-' + zone.id + '-' + Date.now(),
          type: 'GEOFENCE',
          severity: zone.priority === 'CRITICAL' ? 'critical' : 'high',
          title: 'Zone breach: ' + zone.name,
          message: (total - prevTotal) + ' new entity(s) entered ' + zone.name,
          timestamp: Date.now(),
        });
      }
    });
    prevCountsRef.current = Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.total]));
    setGeofenceStats(stats);
  }, [flights, vessels, satellites, region]);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('geofences');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'geofence') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'geofence', name: d.name,
            color: PRIORITY_COLORS[d.priority]?.stroke || '#f43f5e', id: d.id,
            details: { priority: d.priority, description: d.description, scope: d.scope.toUpperCase() },
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
    ds.entities.removeAll();
    if (!layers.geofences) return;
    getVisibleGeofences(region).forEach((zone) => {
      const colors = PRIORITY_COLORS[zone.priority] || PRIORITY_COLORS['MEDIUM'];
      ds.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            zone.polygon.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat))
          ),
          material: Cesium.Color.fromCssColorString(colors.fill),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colors.stroke),
          outlineWidth: 2,
          height: 0,
        },
        position: Cesium.Cartesian3.fromDegrees(
          zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length,
          zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length
        ),
        label: {
          text: zone.name,
          font: '10px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString(colors.stroke),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),
          scale: 0.9,
        },
        properties: { type: 'geofence', data: zone },
      });
    });
  }, [region, layers.geofences]);

  return null;
}
