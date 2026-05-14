import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';
import { classifyAircraft, getMilitaryColor } from '../utils/militaryClassifier';

const POLL_INTERVAL = 15000;

export default function FlightLayer({ viewer }) {
  const setFlights = useStore((s) => s.setFlights);
  const setStats = useStore((s) => s.setStats);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const addAlert = useStore((s) => s.addAlert);
  const addTimelineEvent = useStore((s) => s.addTimelineEvent);
  const bounds = useStore((s) => s.bounds);
  const region = useStore((s) => s.region);
  const dataSourceRef = useRef(null);
  const prevMilitaryRef = useRef(new Set());
  const intervalRef = useRef(null);

  const fetchFlights = useCallback(async (ds, b) => {
    try {
      // For global, OpenSky without bounds returns all worldwide (can be slow)
      // We still pass bounds but they cover the full scope
      const url = `/api/flights?lamin=${b.minLat}&lamax=${b.maxLat}&lomin=${b.minLon}&lomax=${b.maxLon}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.states) return;

      ds.entities.removeAll();

      const flights = data.states
        .filter((s) => s[5] != null && s[6] != null)
        .map((s) => {
          const icao24 = s[0];
          const callsign = (s[1] || '').trim();
          const classification = classifyAircraft(icao24, callsign);
          return {
            icao24, callsign, country: s[2],
            lon: s[5], lat: s[6], altitude: s[7] || 0,
            velocity: s[9] || 0, heading: s[10] || 0,
            verticalRate: s[11] || 0, onGround: s[8],
            classification,
          };
        });

      const currentMilitary = new Set();

      flights.forEach((f) => {
        if (f.onGround) return;

        const color = getMilitaryColor(f.classification);
        const isMilitary = f.classification.classification !== 'civilian';
        const pointSize = isMilitary ? 8 : 5;

        if (isMilitary) currentMilitary.add(f.icao24);

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.altitude),
          point: {
            pixelSize: pointSize,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(isMilitary ? 0.4 : 0.2),
            outlineWidth: isMilitary ? 12 : 6,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: isMilitary
              ? `▲ ${f.callsign || f.icao24} [${f.classification.classification.toUpperCase()}]`
              : (f.callsign || f.icao24),
            font: isMilitary ? '11px JetBrains Mono' : '10px JetBrains Mono',
            fillColor: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(14, -4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 0.9,
            distanceDisplayCondition: isMilitary
              ? new Cesium.DistanceDisplayCondition(0, 8000000)
              : new Cesium.DistanceDisplayCondition(0, 2000000),
          },
          properties: { type: 'flight', data: f },
        });
      });

      // Alerts for new military detections
      if (addAlert) {
        currentMilitary.forEach((icao) => {
          if (!prevMilitaryRef.current.has(icao)) {
            const f = flights.find((fl) => fl.icao24 === icao);
            if (f) {
              addAlert({
                type: 'military-aircraft',
                severity: f.classification.classification === 'military' ? 'critical' : 'warning',
                title: `MIL AIRCRAFT — ${f.callsign || f.icao24}`,
                message: `${f.classification.description} at FL${Math.round(f.altitude / 30.48)} hdg ${Math.round(f.heading)}°`,
                timestamp: new Date(),
              });
            }
          }
        });
      }

      if (addTimelineEvent) {
        const milCount = flights.filter((f) => f.classification.classification !== 'civilian' && !f.onGround).length;
        addTimelineEvent({
          timestamp: new Date(), type: 'flights',
          data: { military: milCount, civilian: flights.filter((f) => !f.onGround).length - milCount, total: flights.filter((f) => !f.onGround).length },
        });
      }

      prevMilitaryRef.current = currentMilitary;
      setFlights(flights);
      setStats({
        flights: flights.filter((f) => !f.onGround).length,
        militaryFlights: flights.filter((f) => f.classification.classification !== 'civilian' && !f.onGround).length,
        lastUpdate: new Date(),
      });
    } catch (err) {
      console.warn('Flight fetch error:', err);
    }
  }, [addAlert, addTimelineEvent, setFlights, setStats]);

  // Setup datasource once
  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('flights');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'flight') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'flight', name: d.callsign || d.icao24,
            color: getMilitaryColor(d.classification), id: d.icao24,
            details: {
              callsign: d.callsign || 'N/A', icao24: d.icao24, country: d.country,
              classification: d.classification.classification.toUpperCase(),
              description: d.classification.description,
              altitude: `${Math.round(d.altitude)}m (FL${Math.round(d.altitude / 30.48)})`,
              speed: `${Math.round(d.velocity)}m/s (${Math.round(d.velocity * 1.944)}kts)`,
              heading: `${Math.round(d.heading)}°`,
              'vert. rate': `${d.verticalRate > 0 ? '+' : ''}${d.verticalRate.toFixed(1)}m/s`,
            },
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current, true);
      }
    };
  }, [viewer]);

  // Fetch + poll — re-runs when bounds/region change
  useEffect(() => {
    if (!dataSourceRef.current) return;
    const ds = dataSourceRef.current;

    // Immediate fetch with new bounds
    fetchFlights(ds, bounds);

    // Reset poll interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchFlights(ds, bounds), POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bounds, region, fetchFlights]);

  return null;
}
