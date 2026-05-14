// Military aircraft classification based on ICAO hex ranges and callsign patterns
// ICAO 24-bit address allocations: https://www.icao.int/publications/doc8585

// Country ICAO hex prefix ranges that include military blocks
const MILITARY_HEX_RANGES = {
  // Russian military (common ranges)
  russia: [
    { start: 0x100000, end: 0x1FFFFF, label: 'Russian Federation' },
  ],
  // Norwegian military
  norway: [
    { start: 0x478000, end: 0x47FFFF, label: 'Norway Military' },
  ],
  // US military
  usa: [
    { start: 0xADF7C8, end: 0xAFFFFF, label: 'US Military' },
  ],
  // UK military
  uk: [
    { start: 0x43C000, end: 0x43FFFF, label: 'UK Military' },
  ],
};

// Callsign patterns that indicate military/government
const MILITARY_CALLSIGN_PATTERNS = [
  // NATO / Norwegian military
  { pattern: /^NOR\d/, type: 'military', country: 'NO', desc: 'Norwegian Air Force' },
  { pattern: /^NORA\d/, type: 'military', country: 'NO', desc: 'Norwegian Armed Forces' },
  { pattern: /^HMK/, type: 'government', country: 'NO', desc: 'Royal Norwegian' },
  // Russian military
  { pattern: /^RF\d/, type: 'military', country: 'RU', desc: 'Russian Air Force' },
  { pattern: /^RFF\d/, type: 'military', country: 'RU', desc: 'Russian Federation' },
  { pattern: /^RSD\d/, type: 'military', country: 'RU', desc: 'Russian Ministry of Defence' },
  // US military
  { pattern: /^RCH\d/, type: 'military', country: 'US', desc: 'USAF AMC (Reach)' },
  { pattern: /^CASA\d/, type: 'military', country: 'US', desc: 'USAF' },
  { pattern: /^DUKE\d/, type: 'military', country: 'US', desc: 'USAF C-17' },
  { pattern: /^EVAC\d/, type: 'military', country: 'US', desc: 'USAF Medevac' },
  { pattern: /^JAKE\d/, type: 'military', country: 'US', desc: 'USMC' },
  { pattern: /^NAVY\d/, type: 'military', country: 'US', desc: 'US Navy' },
  { pattern: /^TOPCAT/, type: 'military', country: 'US', desc: 'USAF Tanker' },
  { pattern: /^RETRO/, type: 'military', country: 'US', desc: 'USAF' },
  // UK military
  { pattern: /^RRR\d/, type: 'military', country: 'GB', desc: 'RAF' },
  { pattern: /^ASCOT\d/, type: 'military', country: 'GB', desc: 'RAF Transport' },
  // NATO AWACS / Surveillance
  { pattern: /^NATO\d/, type: 'military', country: 'NATO', desc: 'NATO' },
  { pattern: /^MAGIC\d/, type: 'military', country: 'NATO', desc: 'NATO AWACS' },
  // German military
  { pattern: /^GAF\d/, type: 'military', country: 'DE', desc: 'German Air Force' },
  // French military
  { pattern: /^FAF\d/, type: 'military', country: 'FR', desc: 'French Air Force' },
  { pattern: /^CTM\d/, type: 'military', country: 'FR', desc: 'French Military Transport' },
  // Swedish military
  { pattern: /^SVF\d/, type: 'military', country: 'SE', desc: 'Swedish Air Force' },
  // Finnish military
  { pattern: /^FNF\d/, type: 'military', country: 'FI', desc: 'Finnish Air Force' },
  // Surveillance / government
  { pattern: /^LAGR\d/, type: 'surveillance', country: 'US', desc: 'US Surveillance' },
  { pattern: /^BLOCKED/, type: 'blocked', country: '??', desc: 'Blocked transponder' },
];

export function classifyAircraft(icao24, callsign) {
  const hex = parseInt(icao24, 16);
  const cs = (callsign || '').trim().toUpperCase();

  // Check callsign patterns first (more specific)
  for (const p of MILITARY_CALLSIGN_PATTERNS) {
    if (p.pattern.test(cs)) {
      return {
        classification: p.type,
        country: p.country,
        description: p.desc,
        confidence: 'high',
      };
    }
  }

  // Check ICAO hex ranges
  for (const [country, ranges] of Object.entries(MILITARY_HEX_RANGES)) {
    for (const range of ranges) {
      if (hex >= range.start && hex <= range.end) {
        return {
          classification: 'possible-military',
          country: range.label,
          description: `${range.label} registered aircraft`,
          confidence: 'low', // Hex range alone doesn't confirm military
        };
      }
    }
  }

  return {
    classification: 'civilian',
    country: null,
    description: 'Commercial/private',
    confidence: 'default',
  };
}

export function getMilitaryColor(classification) {
  switch (classification.classification) {
    case 'military': return '#ef4444';       // Red
    case 'government': return '#f59e0b';     // Amber
    case 'surveillance': return '#f97316';   // Orange
    case 'possible-military': return '#fb923c'; // Light orange
    case 'blocked': return '#ec4899';        // Pink
    default: return '#00d4ff';               // Cyan (civilian)
  }
}
