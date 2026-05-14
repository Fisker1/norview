import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

const RESTRICTED_ZONES = [
  // === NORWAY ===
  { id: 'en-r101', name: 'EN R101 Halkavarre', type: 'military-training', description: 'Norwegian Army live fire — Finnmark', polygon: [[25.0,69.8],[26.5,69.8],[26.5,70.2],[25.0,70.2]], altUpper: 'FL660', active: true, scope: 'norway' },
  { id: 'en-r106', name: 'EN R106 Setermoen', type: 'military-training', description: 'Military training — Troms', polygon: [[17.8,68.7],[18.8,68.7],[18.8,69.1],[17.8,69.1]], altUpper: 'FL245', active: true, scope: 'norway' },
  { id: 'en-r108', name: 'EN R108 Blåtind', type: 'military-training', description: 'Air combat training — Northern Norway', polygon: [[15.0,68.5],[18.0,68.5],[18.0,69.5],[15.0,69.5]], altUpper: 'FL660', active: true, scope: 'norway' },
  { id: 'en-d301', name: 'EN D301 Andøya', type: 'danger-area', description: 'Andøya rocket range — space launch and missile testing', polygon: [[14.5,69.0],[17.0,69.0],[17.0,69.8],[14.5,69.8]], altUpper: 'UNL', active: true, scope: 'norway' },
  { id: 'en-r201', name: 'EN R201 Rena', type: 'military-training', description: 'Rena camp training — Østerdalen', polygon: [[11.0,61.5],[12.0,61.5],[12.0,62.0],[11.0,62.0]], altUpper: 'FL195', active: false, scope: 'norway' },
  { id: 'en-d305', name: 'EN D305 North Sea Oil', type: 'danger-area', description: 'Helicopter ops — Ekofisk oil field', polygon: [[2.5,56.3],[4.0,56.3],[4.0,57.0],[2.5,57.0]], altUpper: 'FL055', active: true, scope: 'norway' },
  { id: 'svalbard-restricted', name: 'Svalbard Restricted', type: 'restricted', description: 'Restricted zone around Svalbard', polygon: [[10.0,77.5],[20.0,77.5],[20.0,79.5],[10.0,79.5]], altUpper: 'FL245', active: true, scope: 'norway' },
  { id: 'russia-adiz-warning', name: 'Russian ADIZ Buffer', type: 'adiz', description: 'Russian Air Defence Identification Zone', polygon: [[30.0,68.0],[42.0,68.0],[42.0,76.0],[30.0,76.0]], altUpper: 'UNL', active: true, scope: 'norway' },

  // === EUROPE ===
  { id: 'nato-trident', name: 'NATO TRIDENT NORTH', type: 'nato-exercise', description: 'NATO exercise — Norwegian Sea', polygon: [[2.0,66.0],[12.0,66.0],[12.0,70.0],[2.0,70.0]], altUpper: 'FL660', active: false, scope: 'europe' },
  { id: 'nato-arctic', name: 'NATO ARCTIC CHALLENGE', type: 'nato-exercise', description: 'Arctic air exercise — Nordics border', polygon: [[22.0,67.0],[28.0,67.0],[28.0,70.0],[22.0,70.0]], altUpper: 'FL660', active: false, scope: 'europe' },
  { id: 'ukraine-conflict', name: 'Ukraine Conflict Zone', type: 'conflict-zone', description: 'Active conflict — all airspace closed', polygon: [[24.0,45.0],[40.0,45.0],[40.0,52.5],[24.0,52.5]], altUpper: 'UNL', active: true, scope: 'europe' },
  { id: 'kaliningrad-adiz', name: 'Kaliningrad ADIZ', type: 'adiz', description: 'Russian exclave air defence zone', polygon: [[19.0,54.0],[22.5,54.0],[22.5,56.0],[19.0,56.0]], altUpper: 'UNL', active: true, scope: 'europe' },
  { id: 'crimea-restricted', name: 'Crimea Restricted', type: 'conflict-zone', description: 'Russian-occupied Crimea — airspace denied', polygon: [[32.0,44.0],[37.0,44.0],[37.0,46.5],[32.0,46.5]], altUpper: 'UNL', active: true, scope: 'europe' },
  { id: 'ramstein-tma', name: 'Ramstein TMA', type: 'military-training', description: 'US/NATO Ramstein Air Base TMA', polygon: [[6.8,49.0],[8.0,49.0],[8.0,49.8],[6.8,49.8]], altUpper: 'FL245', active: true, scope: 'europe' },
  { id: 'baltic-nato-patrol', name: 'Baltic Air Policing', type: 'nato-exercise', description: 'NATO Baltic Air Policing patrol zone', polygon: [[20.0,54.0],[28.0,54.0],[28.0,60.0],[20.0,60.0]], altUpper: 'FL660', active: true, scope: 'europe' },
  { id: 'syria-airspace', name: 'Syria No-Fly', type: 'conflict-zone', description: 'Syrian airspace — active conflict', polygon: [[35.5,32.5],[42.5,32.5],[42.5,37.5],[35.5,37.5]], altUpper: 'UNL', active: true, scope: 'europe' },

  // === GLOBAL ===
  { id: 'taiwan-adiz', name: 'Taiwan ADIZ', type: 'adiz', description: 'Contested Taiwan Air Defence Identification Zone', polygon: [[117.0,21.0],[126.0,21.0],[126.0,29.0],[117.0,29.0]], altUpper: 'UNL', active: true, scope: 'global' },
  { id: 'north-korea-adiz', name: 'North Korea ADIZ', type: 'adiz', description: 'DPRK air defence zone — no-fly', polygon: [[124.0,37.5],[131.0,37.5],[131.0,43.0],[124.0,43.0]], altUpper: 'UNL', active: true, scope: 'global' },
  { id: 'iran-restricted', name: 'Iran Restricted', type: 'restricted', description: 'Iranian military restricted airspace', polygon: [[51.0,27.0],[60.0,27.0],[60.0,37.0],[51.0,37.0]], altUpper: 'UNL', active: true, scope: 'global' },
  { id: 'yemen-conflict', name: 'Yemen Conflict Zone', type: 'conflict-zone', description: 'Active conflict — Houthi-controlled areas', polygon: [[43.0,12.5],[48.0,12.5],[48.0,16.5],[43.0,16.5]], altUpper: 'UNL', active: true, scope: 'global' },
  { id: 'south-china-sea-adiz', name: 'S. China Sea Claims', type: 'adiz', description: 'Chinese 9-dash line claimed zone', polygon: [[105.0,5.0],[118.0,5.0],[118.0,22.0],[105.0,22.0]], altUpper: 'UNL', active: true, scope: 'global' },
  { id: 'hormuz-patrol', name: 'Hormuz Patrol Zone', type: 'military-training', description: 'US/Coalition naval air patrol', polygon: [[54.0,25.0],[58.0,25.0],[58.0,27.5],[54.0,27.5]], altUpper: 'FL245', active: true, scope: 'global' },
];

const TYPE_COLORS = {
  'military-training': { fill: 'rgba(239, 68, 68, 0.08)', stroke: 'rgba(239, 68, 68, 0.45)' },
  'danger-area': { fill: 'rgba(245, 158, 11, 0.08)', stroke: 'rgba(245, 158, 11, 0.45)' },
  'nato-exercise': { fill: 'rgba(59, 130, 246, 0.08)', stroke: 'rgba(59, 130, 246, 0.40)' },
  'restricted': { fill: 'rgba(168, 85, 247, 0.08)', stroke: 'rgba(168, 85, 247, 0.40)' },
  'adiz': { fill: 'rgba(239, 68, 68, 0.05)', stroke: 'rgba(239, 68, 68, 0.25)' },
  'conflict-zone': { fill: 'rgba(239, 68, 68, 0.10)', stroke: 'rgba(239, 68, 68, 0.50)' },
};

function getVisibleZones(regionKey) {
  if (regionKey === 'global') return RESTRICTED_ZONES;
  if (regionKey === 'europe') return RESTRICTED_ZONES.filter((z) => z.scope === 'norway' || z.scope === 'europe');
  return RESTRICTED_ZONES.filter((z) => z.scope === 'norway');
}

export default function AirspaceLayer({ viewer }) {
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const region = useStore((s) => s.region);
  const dataSourceRef = useRef(null);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('airspace');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'airspace') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'airspace', name: d.name,
            color: TYPE_COLORS[d.type]?.stroke || '#a855f7', id: d.id,
            details: {
              type: d.type.replace(/-/g, ' ').toUpperCase(),
              status: d.active ? '● ACTIVE' : '○ INACTIVE',
              'upper limit': d.altUpper,
              description: d.description,
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
    ds.entities.removeAll();

    getVisibleZones(region).forEach((zone) => {
      const colors = TYPE_COLORS[zone.type] || TYPE_COLORS['restricted'];

      ds.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            zone.polygon.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat))
          ),
          material: Cesium.Color.fromCssColorString(colors.fill),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colors.stroke),
          outlineWidth: 1,
          height: 0,
        },
        position: Cesium.Cartesian3.fromDegrees(
          zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length,
          zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length
        ),
        label: {
          text: zone.name,
          font: '9px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString(colors.stroke),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000),
          scale: 0.8,
        },
        properties: { type: 'airspace', data: zone },
      });
    });
  }, [region]);

  return null;
}
