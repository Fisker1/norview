import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store';

const POLL_INTERVAL = 300000;

const WEATHER_GRID = [
  { id: 'tromso', name: 'Tromsø', lat: 69.65, lon: 18.96, scope: 'norway' },
  { id: 'svalbard', name: 'Longyearbyen', lat: 78.22, lon: 15.63, scope: 'norway' },
  { id: 'bodo', name: 'Bodø', lat: 67.28, lon: 14.40, scope: 'norway' },
  { id: 'bergen', name: 'Bergen', lat: 60.39, lon: 5.32, scope: 'norway' },
  { id: 'oslo', name: 'Oslo', lat: 59.91, lon: 10.75, scope: 'norway' },
  { id: 'hammerfest', name: 'Hammerfest', lat: 70.66, lon: 23.68, scope: 'norway' },
  { id: 'vardoe', name: 'Vardø', lat: 70.37, lon: 31.11, scope: 'norway' },
  { id: 'jan-mayen', name: 'Jan Mayen', lat: 71.0, lon: -8.5, scope: 'norway' },
  { id: 'bear-island', name: 'Bear Island', lat: 74.5, lon: 19.0, scope: 'norway' },
  { id: 'reykjavik', name: 'Reykjavik', lat: 64.13, lon: -21.90, scope: 'europe' },
  { id: 'murmansk', name: 'Murmansk', lat: 68.97, lon: 33.07, scope: 'europe' },
  { id: 'stockholm', name: 'Stockholm', lat: 59.33, lon: 18.07, scope: 'europe' },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13, scope: 'europe' },
  { id: 'berlin', name: 'Berlin', lat: 52.52, lon: 13.40, scope: 'europe' },
  { id: 'paris', name: 'Paris', lat: 48.86, lon: 2.35, scope: 'europe' },
  { id: 'washington', name: 'Washington DC', lat: 38.90, lon: -77.04, scope: 'global' },
  { id: 'tokyo', name: 'Tokyo', lat: 35.68, lon: 139.69, scope: 'global' },
  { id: 'dubai', name: 'Dubai', lat: 25.20, lon: 55.27, scope: 'global' },
  { id: 'singapore', name: 'Singapore', lat: 1.35, lon: 103.82, scope: 'global' },
];

function getVisibleStations(regionKey) {
  if (regionKey === 'global') return WEATHER_GRID;
  if (regionKey === 'europe') return WEATHER_GRID.filter((s) => s.scope === 'norway' || s.scope === 'europe');
  return WEATHER_GRID.filter((s) => s.scope === 'norway');
}

function getWindColor(speed) {
  if (speed >= 20) return '#ef4444';
  if (speed >= 14) return '#f97316';
  if (speed >= 8) return '#eab308';
  return '#22c55e';
}

function getWindLabel(speed) {
  if (speed >= 20) return 'STORM';
  if (speed >= 14) return 'STRONG';
  if (speed >= 8) return 'MODERATE';
  return 'CALM';
}

function windDirectionArrow(deg) {
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  return arrows[Math.round(deg / 45) % 8];
}

export default function WeatherLayer({ viewer }) {
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const addAlert = useStore((s) => s.addAlert);
  const region = useStore((s) => s.region);
  const dataSourceRef = useRef(null);
  const weatherCache = useRef({});
  const intervalRef = useRef(null);

  const fetchWeather = useCallback(async (ds, regionKey) => {
    try {
      const stations = getVisibleStations(regionKey);
      const lats = stations.map((s) => s.lat).join(',');
      const lons = stations.map((s) => s.lon).join(',');

      const res = await fetch(`/api/weather?latitudes=${lats}&longitudes=${lons}`);
      const data = await res.json();

      ds.entities.removeAll();

      if (!data || !Array.isArray(data)) return;

      const stormAlerts = [];

      data.forEach((w, i) => {
        if (!w || i >= stations.length) return;
        const station = stations[i];
        const windSpeed = w.windSpeed || 0;
        const windDir = w.windDirection || 0;
        const temp = w.temperature != null ? w.temperature : '--';
        const color = getWindColor(windSpeed);
        const label = getWindLabel(windSpeed);
        const arrow = windDirectionArrow(windDir);

        weatherCache.current[station.id] = { ...w, station };

        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 500),
          point: {
            pixelSize: windSpeed >= 14 ? 10 : 7,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.3),
            outlineWidth: windSpeed >= 14 ? 14 : 8,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `${arrow} ${windSpeed.toFixed(0)}m/s ${temp}°C`,
            font: '10px JetBrains Mono',
            fillColor: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(14, -4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 0.85,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),
          },
          properties: {
            type: 'weather',
            data: { ...w, ...station, windLabel: label },
          },
        });

        if (windSpeed >= 20) stormAlerts.push(station);
      });

      if (addAlert) {
        stormAlerts.slice(0, 2).forEach((s) => {
          const w = weatherCache.current[s.id];
          addAlert({
            type: 'weather-storm',
            severity: 'warning',
            title: `STORM WARNING — ${s.name}`,
            message: `Wind ${w.windSpeed.toFixed(0)}m/s, gusts ${(w.windGusts || 0).toFixed(0)}m/s. Visibility ${((w.visibility || 0) / 1000).toFixed(0)}km.`,
            timestamp: new Date(),
          });
        });
      }
    } catch (err) {
      console.warn('Weather fetch error:', err);
    }
  }, [addAlert]);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('weather');
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties;
        if (props.type && props.type.getValue() === 'weather') {
          const d = props.data.getValue();
          setSelectedEntity({
            type: 'weather',
            name: `WX — ${d.name}`,
            color: getWindColor(d.windSpeed || 0),
            id: d.id,
            details: {
              station: d.name,
              temperature: `${d.temperature != null ? d.temperature.toFixed(1) : '--'}°C`,
              'wind speed': `${(d.windSpeed || 0).toFixed(1)} m/s (${((d.windSpeed || 0) * 1.944).toFixed(0)} kts)`,
              'wind gusts': `${(d.windGusts || 0).toFixed(1)} m/s`,
              'wind direction': `${(d.windDirection || 0).toFixed(0)}° ${windDirectionArrow(d.windDirection || 0)}`,
              condition: d.windLabel,
              visibility: `${((d.visibility || 0) / 1000).toFixed(1)} km`,
              humidity: `${d.humidity || '--'}%`,
              'cloud cover': `${d.cloudCover || '--'}%`,
              precipitation: `${(d.precipitation || 0).toFixed(1)} mm`,
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

    fetchWeather(ds, region);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchWeather(ds, region), POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [region, fetchWeather]);

  return null;
}
