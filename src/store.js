import { create } from 'zustand';

export const REGIONS = {
  norway: {
    key: 'norway',
    label: 'NORWAY',
    desc: 'Arctic / High North',
    bounds: { minLat: 57.5, maxLat: 81.0, minLon: -5.0, maxLon: 45.0 },
    camera: { lon: 15.0, lat: 65.0, height: 4000000, pitch: -60 },
  },
  europe: {
    key: 'europe',
    label: 'EUROPE',
    desc: 'NATO / EU Theatre',
    bounds: { minLat: 34.0, maxLat: 72.0, minLon: -15.0, maxLon: 45.0 },
    camera: { lon: 15.0, lat: 50.0, height: 8000000, pitch: -50 },
  },
  global: {
    key: 'global',
    label: 'GLOBAL',
    desc: 'Worldwide OSINT',
    bounds: { minLat: -90.0, maxLat: 90.0, minLon: -180.0, maxLon: 180.0 },
    camera: { lon: 15.0, lat: 30.0, height: 20000000, pitch: -90 },
  },
};

const useStore = create((set, get) => ({
  // Region
  region: 'norway',
  setRegion: (r) => {
    const cfg = REGIONS[r];
    if (!cfg) return;
    set({
      region: r,
      bounds: cfg.bounds,
    });
  },

  // Layer visibility
  layers: {
    flights: true,
    vessels: true,
    satellites: true,
    airspaces: true,
    gpsJamming: true,
    geofences: true,
    weather: true,
  },
  toggleLayer: (layer) =>
    set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),

  // Visual filter
  visualFilter: 'normal',
  setVisualFilter: (f) => set({ visualFilter: f }),

  // Panoptic Mode (GODS EYE / Maven inspired)
  panopticMode: false,
  togglePanoptic: () => set((s) => ({ panopticMode: !s.panopticMode })),

  // Data caches
  flights: [],
  setFlights: (d) => set({ flights: d }),
  vessels: [],
  setVessels: (d) => set({ vessels: d }),
  satellites: [],
  setSatellites: (d) => set({ satellites: d }),

  // Selection
  selectedEntity: null,
  setSelectedEntity: (e) => set({ selectedEntity: e }),

  // Stats
  stats: {
    flights: 0,
    militaryFlights: 0,
    vessels: 0,
    darkVessels: 0,
    vesselAnomalies: 0,
    satellites: 0,
    lastUpdate: null,
  },
  setStats: (s) => set((prev) => ({ stats: { ...prev.stats, ...s } })),

  // Alerts
  alerts: [],
  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 100) })),
  clearAlerts: () => set({ alerts: [] }),

  // Timeline events
  timelineEvents: [],
  addTimelineEvent: (event) =>
    set((s) => ({
      timelineEvents: [...s.timelineEvents, event].slice(-500),
    })),

  // Geofence stats (Maven AOI / GODS EYE zone monitoring)
  geofenceStats: {},
  setGeofenceStats: (stats) => set({ geofenceStats: stats }),

  // Bounds (initialized to Norway, updated by setRegion)
  bounds: REGIONS.norway.bounds,
}));

export default useStore;
