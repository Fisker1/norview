import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

// GPS jamming/spoofing zones — tagged by region scope
const JAMMING_ZONES = [
  // === NORWAY / ARCTIC ===
  { id: 'kola-peninsula', name: 'Kola Peninsula Zone', description: 'Persistent GPS interference from Russian EW systems near Murmansk', center: [33.0, 68.9], radius: 150000, severity: 'high', source: 'Russian EW — Krasukha-4 / Murmansk-BN', firstReported: '2017-10', active: true, scope: 'norway' },
  { id: 'finnmark-border', name: 'Finnmark Border Region', description: 'GPS disruption spillover affecting northern Norway', center: [29.5, 70.0], radius: 100000, severity: 'high', source: 'Cross-border EW spillover', firstReported: '2018-02', active: true, scope: 'norway' },
  { id: 'svalbard-approach', name: 'Svalbard Approach', description: 'Intermittent GPS spoofing on Arctic shipping routes', center: [18.0, 77.5], radius: 80000, severity: 'medium', source: 'Suspected naval EW operations', firstReported: '2023-06', active: true, scope: 'norway' },
  { id: 'barents-sea-north', name: 'Northern Barents Sea', description: 'GPS interference near Russian Northern Fleet exercises', center: [38.0, 73.0], radius: 200000, severity: 'high', source: 'Northern Fleet EW exercises', firstReported: '2019-11', active: true, scope: 'norway' },
  { id: 'tromsoe-intermittent', name: 'Tromsø Region', description: 'Intermittent GPS degradation reported by aviation', center: [19.0, 69.7], radius: 60000, severity: 'low', source: 'Unattributed', firstReported: '2022-03', active: false, scope: 'norway' },
  { id: 'north-cape-shipping', name: 'North Cape Shipping Lane', description: 'Sporadic GPS spoofing affecting commercial shipping', center: [25.8, 71.2], radius: 50000, severity: 'low', source: 'Unattributed', firstReported: '2024-01', active: true, scope: 'norway' },

  // === EUROPE ===
  { id: 'baltic-kaliningrad', name: 'Kaliningrad/Baltic', description: 'GPS jamming from Kaliningrad enclave affecting Baltic states, Poland, Sweden', center: [20.5, 54.7], radius: 180000, severity: 'high', source: 'Russian EW — Kaliningrad Oblast', firstReported: '2018-06', active: true, scope: 'europe' },
  { id: 'black-sea-crimea', name: 'Black Sea / Crimea', description: 'Widespread GPS spoofing affecting maritime and aviation. Ships reported teleporting to airports.', center: [34.0, 44.5], radius: 250000, severity: 'high', source: 'Russian military — Crimea occupation forces', firstReported: '2017-06', active: true, scope: 'europe' },
  { id: 'eastern-med', name: 'Eastern Mediterranean', description: 'GPS spoofing near Syria/Lebanon affecting commercial aviation', center: [35.5, 34.0], radius: 200000, severity: 'high', source: 'Attributed to Russian forces in Syria (Khmeimim)', firstReported: '2018-03', active: true, scope: 'europe' },
  { id: 'cyprus-basin', name: 'Cyprus Basin', description: 'GPS interference affecting flights into Larnaca and Nicosia', center: [33.5, 35.0], radius: 100000, severity: 'medium', source: 'Spillover from Syrian/Israeli EW', firstReported: '2023-10', active: true, scope: 'europe' },
  { id: 'baltic-finland', name: 'Baltic/Finland Border', description: 'GPS degradation near Finnish-Russian border', center: [28.0, 62.0], radius: 120000, severity: 'medium', source: 'Russian EW — cross-border', firstReported: '2022-11', active: true, scope: 'europe' },
  { id: 'donbas-ukraine', name: 'Eastern Ukraine', description: 'Heavy GPS denial across conflict zone', center: [38.0, 48.0], radius: 300000, severity: 'high', source: 'Russian military EW — active conflict', firstReported: '2022-02', active: true, scope: 'europe' },

  // === GLOBAL ===
  { id: 'novaya-zemlya', name: 'Novaya Zemlya', description: 'GPS denial around Russian nuclear test range', center: [55.0, 73.5], radius: 120000, severity: 'medium', source: 'Military restricted zone', firstReported: '2020-01', active: true, scope: 'global' },
  { id: 'strait-hormuz', name: 'Strait of Hormuz', description: 'GPS spoofing targeting oil tankers — ships report false positions', center: [56.3, 26.5], radius: 150000, severity: 'high', source: 'Attributed to Iranian IRGC Navy', firstReported: '2019-07', active: true, scope: 'global' },
  { id: 'south-china-sea', name: 'South China Sea', description: 'GPS manipulation near contested islands and military installations', center: [112.0, 16.0], radius: 300000, severity: 'medium', source: 'Chinese military — island bases', firstReported: '2019-11', active: true, scope: 'global' },
  { id: 'north-korea', name: 'Korean DMZ', description: 'GPS jamming from North Korean military targeting South Korean GPS', center: [127.0, 38.0], radius: 200000, severity: 'high', source: 'DPRK military EW', firstReported: '2016-04', active: true, scope: 'global' },
  { id: 'red-sea-yemen', name: 'Red Sea / Yemen', description: 'GPS disruption near Houthi-controlled areas affecting shipping', center: [42.5, 14.0], radius: 150000, severity: 'medium', source: 'Houthi forces / Iranian EW support', firstReported: '2024-01', active: true, scope: 'global' },
  { id: 'taiwan-strait', name: 'Taiwan Strait', description: 'Intermittent GPS interference during Chinese military exercises', center: [119.5, 24.5], radius: 120000, severity: 'medium', source: 'PLA military exercises', firstReported: '2022-08', active: true, scope: 'global' },
];

const SEVERITY_COLORS = {
  high: { fill: 'rgba(239, 68, 68, 0.12)', stroke: 'rgba(239, 68, 68, 0.6)', pulse: '#ef4444' },
  medium: { fill: 'rgba(245, 158, 11, 0.10)', stroke: 'rgba(245, 158, 11, 0.5)', pulse: '#f59e0b' },
  low: { fill: 'rgba(234, 179, 8, 0.06)', stroke: 'rgba(234, 179, 8, 0.35)', pulse: '#eab308' },
};

function getVisibleZones(regionKey) {
  // Norway sees norway zones, Europe sees norway+europe, Global sees all
  if (regionKey === 'global') return JAMMING_ZONES;
  if (regionKey === 'europe') return JAMMING_ZONES.filter((z) => z.scope === 'norway' || z.scope === 'europe');
  return JAMMING_ZONES.filter((z) => z.scope === 'norway');
}

export default function GpsJammingLayer({ viewer }) {
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const addAlert = useStore((s) => s.addAlert);
  const region = useStore((s) => s.region);
  const dataSourceRef = useRef(null);

  // Setup datasource once
  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('gps-jamming');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'gps-jamming') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'gps-jamming', name: d.name,
            color: SEVERITY_COLORS[d.severity].pulse, id: d.id,
            details: {
              severity: d.severity.toUpperCase(),
              status: d.active ? '● ACTIVE' : '○ INACTIVE',
              source: d.source,
              radius: `${(d.radius / 1000).toFixed(0)} km`,
              'first reported': d.firstReported,
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

  // Render zones when region changes
  useEffect(() => {
    if (!dataSourceRef.current) return;
    const ds = dataSourceRef.current;
    ds.entities.removeAll();

    const zones = getVisibleZones(region);

    zones.forEach((zone) => {
      const colors = SEVERITY_COLORS[zone.severity];

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(zone.center[0], zone.center[1]),
        ellipse: {
          semiMajorAxis: zone.radius,
          semiMinorAxis: zone.radius,
          material: Cesium.Color.fromCssColorString(colors.fill),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colors.stroke),
          outlineWidth: 2,
          height: 0,
        },
        label: {
          text: `⚠ ${zone.name}`,
          font: '10px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString(colors.pulse),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),
          scale: 0.85,
        },
        properties: { type: 'gps-jamming', data: zone },
      });

      // Outer ring
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(zone.center[0], zone.center[1]),
        ellipse: {
          semiMajorAxis: zone.radius * 1.3,
          semiMinorAxis: zone.radius * 1.3,
          material: Cesium.Color.TRANSPARENT,
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colors.stroke).withAlpha(0.15),
          outlineWidth: 1,
          height: 0,
        },
      });
    });

    // Alerts for active high-severity zones
    if (addAlert) {
      zones.filter((z) => z.active && z.severity === 'high').slice(0, 3).forEach((z) => {
        addAlert({
          type: 'gps-jamming', severity: 'warning',
          title: `GPS INTERFERENCE — ${z.name}`,
          message: z.description,
          timestamp: new Date(),
        });
      });
    }
  }, [region]);

  return null;
}
