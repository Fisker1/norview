/**
 * Cross-Domain Intelligence Correlation Engine
 *
 * Inspired by Palantir Maven's data-fusion pipeline and Bilawal Sidhu's
 * GODS EYE multi-source OSINT correlation.  Scans all active entity layers
 * (flights, vessels, satellites, GPS-jamming zones, restricted airspace)
 * and finds spatial-temporal clusters that indicate coordinated or
 * anomalous activity across domains.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Proximity threshold in km for considering two entities "co-located"
const PROXIMITY_KM = 120;

// ---------------------------------------------------------------------------
// Correlation patterns
// ---------------------------------------------------------------------------

/**
 * Each pattern returns an array of correlation objects:
 * { id, title, severity, domains, summary, entities[], lat, lon }
 */

function darkVesselGpsJamming(vessels, gpsZones) {
  const results = [];
  const darkVessels = (vessels || []).filter((v) => !v.aisActive);

  darkVessels.forEach((v) => {
    (gpsZones || []).forEach((zone) => {
      const dist = haversineKm(v.lat, v.lon, zone.lat, zone.lon);
      if (dist < PROXIMITY_KM) {
        results.push({
          id: `dv-gps-${v.mmsi}-${zone.id || zone.name}`,
          title: 'DARK VESSEL IN GPS-DENIED AREA',
          severity: 'CRITICAL',
          domains: ['MARITIME', 'EW'],
          summary: `${v.name} (AIS off) operating ${Math.round(dist)} km from GPS jamming zone "${zone.name}". Possible EMCON / covert transit.`,
          entities: [
            { type: 'vessel', id: v.mmsi, name: v.name },
            { type: 'gps-zone', id: zone.name, name: zone.name },
          ],
          lat: v.lat,
          lon: v.lon,
        });
      }
    });
  });
  return results;
}

function militaryFlightVesselCluster(flights, vessels) {
  const results = [];
  const milFlights = (flights || []).filter((f) => f.military);
  const anomalyVessels = (vessels || []).filter((v) => v.anomalyScore >= 25);

  milFlights.forEach((f) => {
    anomalyVessels.forEach((v) => {
      const dist = haversineKm(f.lat || f.latitude, f.lon || f.longitude, v.lat, v.lon);
      if (dist < PROXIMITY_KM) {
        results.push({
          id: `mil-ves-${f.icao24 || f.callsign}-${v.mmsi}`,
          title: 'MILITARY AIRCRAFT NEAR ANOMALY VESSEL',
          severity: 'HIGH',
          domains: ['AIR', 'MARITIME'],
          summary: `Military aircraft ${f.callsign || f.icao24 || 'UNKNOWN'} within ${Math.round(dist)} km of anomaly vessel ${v.name} (score ${v.anomalyScore}).`,
          entities: [
            { type: 'flight', id: f.icao24 || f.callsign, name: f.callsign || f.icao24 },
            { type: 'vessel', id: v.mmsi, name: v.name },
          ],
          lat: (f.lat || f.latitude + v.lat) / 2,
          lon: (f.lon || f.longitude + v.lon) / 2,
        });
      }
    });
  });
  return results;
}

function satelliteOverDarkVessel(satellites, vessels) {
  const results = [];
  const milSats = (satellites || []).filter(
    (s) => s.type === 'military' || s.classification === 'military'
  );
  const darkVessels = (vessels || []).filter((v) => !v.aisActive);

  milSats.forEach((s) => {
    darkVessels.forEach((v) => {
      if (s.lat === undefined || s.lon === undefined) return;
      const dist = haversineKm(s.lat, s.lon, v.lat, v.lon);
      if (dist < 200) {
        results.push({
          id: `sat-dv-${s.noradId || s.name}-${v.mmsi}`,
          title: 'MILITARY SAT PASS OVER DARK VESSEL',
          severity: 'HIGH',
          domains: ['SPACE', 'MARITIME'],
          summary: `${s.name || 'Military satellite'} ground-track within ${Math.round(dist)} km of dark vessel ${v.name}. Possible ISR collection window.`,
          entities: [
            { type: 'satellite', id: s.noradId || s.name, name: s.name },
            { type: 'vessel', id: v.mmsi, name: v.name },
          ],
          lat: v.lat,
          lon: v.lon,
        });
      }
    });
  });
  return results;
}

function vesselClusterNearInfrastructure(vessels) {
  const results = [];
  const anomalies = (vessels || []).filter((v) => v.anomalyScore >= 40 && v.nearSensitive);

  // Group by sensitive area
  const grouped = {};
  anomalies.forEach((v) => {
    const key = v.nearSensitive;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  Object.entries(grouped).forEach(([area, vList]) => {
    if (vList.length >= 2) {
      results.push({
        id: `cluster-infra-${area}`,
        title: 'VESSEL CLUSTER NEAR CRITICAL INFRASTRUCTURE',
        severity: 'CRITICAL',
        domains: ['MARITIME', 'INFRA'],
        summary: `${vList.length} anomaly vessels clustered near ${area}. Coordinated surveillance or sabotage risk.`,
        entities: vList.map((v) => ({ type: 'vessel', id: v.mmsi, name: v.name })),
        lat: vList.reduce((s, v) => s + v.lat, 0) / vList.length,
        lon: vList.reduce((s, v) => s + v.lon, 0) / vList.length,
      });
    }
  });
  return results;
}

function gpsJammingAirspaceConflict(gpsZones, flights) {
  const results = [];
  (gpsZones || []).forEach((zone) => {
    const affectedFlights = (flights || []).filter((f) => {
      const fLat = f.lat || f.latitude;
      const fLon = f.lon || f.longitude;
      if (fLat === undefined || fLon === undefined) return false;
      return haversineKm(fLat, fLon, zone.lat, zone.lon) < PROXIMITY_KM;
    });

    const civilFlights = affectedFlights.filter((f) => !f.military);
    if (civilFlights.length >= 3) {
      results.push({
        id: `gps-civil-${zone.name}`,
        title: 'GPS DENIAL AFFECTING CIVIL AVIATION',
        severity: 'HIGH',
        domains: ['EW', 'AIR'],
        summary: `${civilFlights.length} civil aircraft operating in GPS-denied zone near "${zone.name}". Navigation safety risk.`,
        entities: [
          { type: 'gps-zone', id: zone.name, name: zone.name },
          ...civilFlights.slice(0, 5).map((f) => ({
            type: 'flight',
            id: f.icao24 || f.callsign,
            name: f.callsign || f.icao24,
          })),
        ],
        lat: zone.lat,
        lon: zone.lon,
      });
    }
  });
  return results;
}

// ---------------------------------------------------------------------------
// Main correlator
// ---------------------------------------------------------------------------

const GPS_JAMMING_ZONES = [
  { name: 'Kola Peninsula', lat: 69.0, lon: 33.0, radius: 150, id: 'kola' },
  { name: 'Kaliningrad', lat: 54.7, lon: 20.5, radius: 100, id: 'kaliningrad' },
  { name: 'Eastern Finland', lat: 64.0, lon: 28.0, radius: 80, id: 'finland' },
  { name: 'Syria/Eastern Med', lat: 35.0, lon: 37.0, radius: 120, id: 'syria' },
  { name: 'Northern Norway', lat: 70.0, lon: 25.0, radius: 100, id: 'finnmark' },
  { name: 'Baltic Sea', lat: 56.5, lon: 18.0, radius: 90, id: 'baltic' },
  { name: 'Black Sea', lat: 44.0, lon: 34.0, radius: 110, id: 'blacksea' },
  { name: 'Strait of Hormuz', lat: 26.5, lon: 56.3, radius: 80, id: 'hormuz' },
];

export function runCorrelation({ flights, vessels, satellites }) {
  const correlations = [
    ...darkVesselGpsJamming(vessels, GPS_JAMMING_ZONES),
    ...militaryFlightVesselCluster(flights, vessels),
    ...satelliteOverDarkVessel(satellites, vessels),
    ...vesselClusterNearInfrastructure(vessels),
    ...gpsJammingAirspaceConflict(GPS_JAMMING_ZONES, flights),
  ];

  // Deduplicate by id, keep highest severity
  const deduped = {};
  const sevRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  correlations.forEach((c) => {
    if (!deduped[c.id] || sevRank[c.severity] < sevRank[deduped[c.id].severity]) {
      deduped[c.id] = c;
    }
  });

  const sorted = Object.values(deduped).sort(
    (a, b) => (sevRank[a.severity] ?? 4) - (sevRank[b.severity] ?? 4)
  );

  return sorted;
}
