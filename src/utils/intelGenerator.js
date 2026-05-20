/**
 * intelGenerator.js
 * Generates simulated multi-source OSINT intelligence reports.
 * Inspired by GODS EYE multi-source signal fusion and Maven multi-INT integration.
 */

const INTEL_TYPES = {
  SIGINT: { label: 'SIGINT', color: '#ef4444', icon: '\u{1F4E1}', desc: 'Signals Intelligence' },
  OSINT: { label: 'OSINT', color: '#3b82f6', icon: '\u{1F310}', desc: 'Open Source Intelligence' },
  IMINT: { label: 'IMINT', color: '#a855f7', icon: '\u{1F6F0}\uFE0F', desc: 'Imagery Intelligence' },
  HUMINT: { label: 'HUMINT', color: '#22c55e', icon: '\u{1F464}', desc: 'Human Intelligence' },
  MASINT: { label: 'MASINT', color: '#f59e0b', icon: '\u{1F4CA}', desc: 'Measurement & Signature' },
};

const CLASSIFICATION_LEVELS = [
  { level: 'TOP SECRET', color: '#ef4444', abbr: 'TS' },
  { level: 'SECRET', color: '#f97316', abbr: 'S' },
  { level: 'CONFIDENTIAL', color: '#eab308', abbr: 'C' },
  { level: 'UNCLASSIFIED', color: '#22c55e', abbr: 'U' },
];

const PRIORITY = {
  FLASH: { label: 'FLASH', color: '#ef4444', rank: 0 },
  IMMEDIATE: { label: 'IMMEDIATE', color: '#f97316', rank: 1 },
  PRIORITY: { label: 'PRIORITY', color: '#eab308', rank: 2 },
  ROUTINE: { label: 'ROUTINE', color: '#22c55e', rank: 3 },
};

const INTEL_TEMPLATES = {
  norway: [
    { type: 'SIGINT', priority: 'FLASH', classification: 'TOP SECRET', title: 'ABNORMAL RF EMISSIONS \u2014 KOLA PENINSULA', summary: 'Detected burst transmissions on military frequencies from Severomorsk naval complex. Pattern consistent with fleet mobilization comms.', source: 'SIGINT Station Vard\u00F8', confidence: 92, lat: 69.1, lon: 33.1 },
    { type: 'OSINT', priority: 'IMMEDIATE', classification: 'UNCLASSIFIED', title: 'VESSEL DEVIATION \u2014 NORTHERN SEA ROUTE', summary: 'Commercial AIS data shows 3 bulk carriers deviating from standard Northern Sea Route corridor near Novaya Zemlya.', source: 'MarineTraffic / AIS Hub', confidence: 78, lat: 74.5, lon: 55.0 },
    { type: 'IMINT', priority: 'PRIORITY', classification: 'SECRET', title: 'NEW CONSTRUCTION \u2014 SVALBARD PROXIMITY', summary: 'Sentinel-2 imagery reveals new structures at Barentsburg consistent with communications relay installation.', source: 'Sentinel Hub Archive', confidence: 85, lat: 78.06, lon: 14.22 },
    { type: 'HUMINT', priority: 'ROUTINE', classification: 'CONFIDENTIAL', title: 'UNUSUAL FISHING ACTIVITY \u2014 LOFOTEN', summary: 'Local sources report unregistered trawlers operating at night near subsea cable landing points.', source: 'Field Report NOR-2461', confidence: 65, lat: 68.2, lon: 14.5 },
    { type: 'MASINT', priority: 'IMMEDIATE', classification: 'SECRET', title: 'SUBSURFACE ACOUSTIC ANOMALY \u2014 BARENTS SEA', summary: 'SOSUS array detected low-frequency tonal consistent with submarine transit in known SSBN patrol areas.', source: 'IUSS / SOSUS Network', confidence: 71, lat: 72.5, lon: 28.0 },
    { type: 'SIGINT', priority: 'PRIORITY', classification: 'SECRET', title: 'GPS SPOOFING DETECTED \u2014 FINNMARK', summary: 'Multiple aircraft report GPS position errors exceeding 10nm near Norwegian-Russian border.', source: 'EUROCONTROL / AVINOR', confidence: 88, lat: 69.8, lon: 29.5 },
    { type: 'OSINT', priority: 'ROUTINE', classification: 'UNCLASSIFIED', title: 'NATO EXERCISE NOTIFICATION', summary: 'Norwegian MOD published exercise area coordinates. Expect increased military air/sea traffic through Thursday.', source: 'Forsvaret.no / NATO MARCOM', confidence: 99, lat: 64.0, lon: 10.0 },
    { type: 'IMINT', priority: 'FLASH', classification: 'TOP SECRET', title: 'MISSILE TEL DEPLOYMENT \u2014 KOLA', summary: 'Satellite pass detected vehicle movement consistent with Bastion coastal defense TEL repositioning.', source: 'NRO Tasking KH-11', confidence: 82, lat: 68.9, lon: 33.5 },
  ],
  europe: [
    { type: 'SIGINT', priority: 'FLASH', classification: 'TOP SECRET', title: 'ENCRYPTED BURST \u2014 KALININGRAD', summary: 'Intercepted encrypted HF burst traffic from Kaliningrad military district. Volume 300% above baseline.', source: 'NATO SIGINT', confidence: 87, lat: 54.7, lon: 20.5 },
    { type: 'OSINT', priority: 'IMMEDIATE', classification: 'UNCLASSIFIED', title: 'SHIP CONGESTION \u2014 BOSPHORUS', summary: 'Vessel queue at Bosphorus Strait exceeds 40 ships. Multiple tankers reporting extended wait times.', source: 'Vessel Finder / Reuters', confidence: 95, lat: 41.1, lon: 29.1 },
    { type: 'IMINT', priority: 'PRIORITY', classification: 'SECRET', title: 'AIRFIELD ACTIVITY \u2014 CRIMEA', summary: 'Increased rotary-wing activity at Saky airbase. At least 6 additional airframes detected on apron.', source: 'Planet Labs Daily', confidence: 80, lat: 45.1, lon: 33.6 },
    { type: 'HUMINT', priority: 'ROUTINE', classification: 'CONFIDENTIAL', title: 'PORT ACTIVITY \u2014 TARTUS', summary: 'Reports indicate unusual cargo handling at Russian naval facility in Tartus. Covered vehicles loaded from cargo vessel.', source: 'Field Report EUR-0892', confidence: 58, lat: 34.9, lon: 35.9 },
    { type: 'MASINT', priority: 'IMMEDIATE', classification: 'SECRET', title: 'EW EMISSIONS \u2014 BALTIC', summary: 'Detected S-400 fire control radar emissions from Kaliningrad. Engagement mode active for 47 minutes.', source: 'NATO ELINT', confidence: 91, lat: 54.9, lon: 20.2 },
    { type: 'OSINT', priority: 'PRIORITY', classification: 'UNCLASSIFIED', title: 'CABLE MAINTENANCE \u2014 NORTH SEA', summary: 'Subsea cable operator reports unscheduled maintenance on North Sea interconnector.', source: 'Submarine Cable Map', confidence: 73, lat: 56.0, lon: 3.5 },
  ],
  global: [
    { type: 'SIGINT', priority: 'FLASH', classification: 'TOP SECRET', title: 'LAUNCH TELEMETRY \u2014 SOUTH CHINA SEA', summary: 'Detected missile test telemetry signals from Hainan Island. Trajectory data suggests MRBM profile.', source: 'SIGINT Pacific', confidence: 89, lat: 19.5, lon: 109.5 },
    { type: 'OSINT', priority: 'IMMEDIATE', classification: 'UNCLASSIFIED', title: 'TANKER CONGESTION \u2014 STRAIT OF HORMUZ', summary: 'AIS shows 12 VLCCs anchored outside strait. Iranian naval vessels conducting unusual patrol patterns.', source: 'TankerTrackers.com / AIS', confidence: 94, lat: 26.5, lon: 56.3 },
    { type: 'IMINT', priority: 'PRIORITY', classification: 'SECRET', title: 'ISLAND CONSTRUCTION \u2014 SPRATLY ISLANDS', summary: 'New imagery shows expansion of airstrip on Mischief Reef. Hardened shelters under construction.', source: 'CSIS / AMTI Imagery', confidence: 86, lat: 9.9, lon: 115.5 },
    { type: 'HUMINT', priority: 'ROUTINE', classification: 'CONFIDENTIAL', title: 'PIRACY WARNING \u2014 GULF OF GUINEA', summary: 'Merchant sources report armed speedboats shadowing cargo vessels 80nm south of Lagos.', source: 'IMB Piracy Centre', confidence: 72, lat: 5.5, lon: 3.4 },
    { type: 'MASINT', priority: 'IMMEDIATE', classification: 'SECRET', title: 'SEISMIC EVENT \u2014 LOP NUR', summary: 'CTBTO station detected anomalous low-magnitude event near test site. Analysis ongoing.', source: 'CTBTO / IMS Network', confidence: 63, lat: 41.8, lon: 88.7 },
    { type: 'SIGINT', priority: 'PRIORITY', classification: 'SECRET', title: 'SUBMARINE COMMS \u2014 TAIWAN STRAIT', summary: 'Detected VLF submarine communication transmissions from Yulin Naval Base. Pattern suggests deployment order.', source: 'NSA Pacific SIGINT', confidence: 77, lat: 18.2, lon: 109.5 },
  ],
};

let _idCounter = 0;

export function generateIntelReports(region) {
  const templates = [
    ...(INTEL_TEMPLATES.norway || []),
    ...(region === 'europe' || region === 'global' ? INTEL_TEMPLATES.europe || [] : []),
    ...(region === 'global' ? INTEL_TEMPLATES.global || [] : []),
  ];

  const count = Math.max(3, Math.floor(templates.length * (0.7 + Math.random() * 0.3)));
  const shuffled = [...templates].sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((t) => {
    const id = 'INTEL-' + String(++_idCounter).padStart(4, '0');
    const age = Math.floor(Math.random() * 7200000);
    const timestamp = new Date(Date.now() - age);
    const confidence = Math.max(30, Math.min(100, t.confidence + Math.floor((Math.random() - 0.5) * 12)));

    return { id, ...t, confidence, timestamp, read: false };
  }).sort((a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank);
}

export { INTEL_TYPES, CLASSIFICATION_LEVELS, PRIORITY };
