import { PrivacyIssue, PrivacyRiskReport } from './types';

export function analyzePrivacyRisks(metadata: Record<string, any>, nativeMetadata?: Record<string, any>): PrivacyRiskReport {
  const issues: PrivacyIssue[] = [];

  // Helper to search across flat or nested objects
  const searchValues: Record<string, any> = Object.create(null);
  const seen = new WeakSet<object>();

  function traverse(obj: any, prefix = '', depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 12 || seen.has(obj)) return;
    seen.add(obj);
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
          traverse(value, fullKey, depth + 1);
        } else {
          const normalized = key.split(':').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (value !== '' && (!Array.isArray(value) || value.length)) searchValues[normalized] = { key: fullKey, value };
          searchValues[fullKey.toLowerCase()] = { key: fullKey, value };
          if (typeof value === 'string' && value.length < 2000000 && /^[\s]*[\[{]/.test(value)) {
            try { traverse(JSON.parse(value), fullKey, depth + 1); } catch { /* Ordinary text need not be JSON. */ }
          }
          if (Array.isArray(value)) value.forEach((item, index) => { if (item && typeof item === 'object') traverse(item, `${fullKey}.${index}`, depth + 1); });
        }
      }
    }
  }

  traverse(metadata);
  if (nativeMetadata) traverse(nativeMetadata);

  // 1. GPS Checks (High Severity)
  const gpsKeys = [
    'latitude', 'longitude', 'gpslatitude', 'gpslongitude', 'gpsposition', 
    'gpsaltitude', 'gpsdestlatitude', 'gpsdestlongitude'
  ];

  let hasGps = false;
  for (const k of gpsKeys) {
    if (searchValues[k] && searchValues[k].value !== undefined) {
      hasGps = true;
      issues.push({
        id: `gps-${k}`,
        severity: 'HIGH',
        title: 'Geographic Location Exposed',
        description: `Precise GPS coordinates (${searchValues[k].key}) leak the exact physical capture location.`,
        tagKey: searchValues[k].key,
        value: String(searchValues[k].value),
        category: 'GPS'
      });
      break; // One primary GPS alert is sufficient for the headline, but we flag hasGps
    }
  }

  // 2. Hardware / Device Serial Numbers (Medium/High Severity)
  const serialKeys = [
    { key: 'cameraserialnumber', label: 'Camera Body Serial Number', sev: 'HIGH' as const },
    { key: 'bodyserialnumber', label: 'Body Serial Number', sev: 'HIGH' as const },
    { key: 'lensserialnumber', label: 'Lens Serial Number', sev: 'MEDIUM' as const },
    { key: 'serialnumber', label: 'Hardware Serial Number', sev: 'HIGH' as const },
    { key: 'internalserialnumber', label: 'Internal Serial Number', sev: 'HIGH' as const },
    { key: 'cameraownername', label: 'Camera Registered Owner', sev: 'MEDIUM' as const },
    { key: 'ownername', label: 'Device Owner Name', sev: 'MEDIUM' as const }
  ];

  let hasDeviceSerial = false;
  for (const item of serialKeys) {
    if (searchValues[item.key] && searchValues[item.key].value) {
      hasDeviceSerial = true;
      issues.push({
        id: `device-${item.key}`,
        severity: item.sev,
        title: item.label,
        description: `Hardware identifier exposes unique device signature for cross-image tracking.`,
        tagKey: searchValues[item.key].key,
        value: String(searchValues[item.key].value),
        category: 'DEVICE'
      });
    }
  }

  // 3. Software & Environment Fingerprints (Medium/Low Severity)
  const softwareKeys = [
    { key: 'hostcomputer', label: 'Host Machine Name / OS', sev: 'MEDIUM' as const },
    { key: 'software', label: 'Software / Editing Suite', sev: 'LOW' as const },
    { key: 'processingsoftware', label: 'Processing Pipeline Software', sev: 'LOW' as const },
    { key: 'originalrawfilename', label: 'Original Raw File Path', sev: 'MEDIUM' as const },
    { key: 'documentname', label: 'Document / File Hierarchy', sev: 'LOW' as const }
  ];

  let hasSoftwareInfo = false;
  for (const item of softwareKeys) {
    if (searchValues[item.key] && searchValues[item.key].value) {
      hasSoftwareInfo = true;
      issues.push({
        id: `sw-${item.key}`,
        severity: item.sev,
        title: item.label,
        description: `Exposes operating system, machine hostname, or software build version.`,
        tagKey: searchValues[item.key].key,
        value: String(searchValues[item.key].value),
        category: 'SOFTWARE'
      });
    }
  }

  // 4. Personal Identifiable Information (Low/Medium Severity)
  const personalKeys = [
    { key: 'artist', label: 'Author / Artist Name' },
    { key: 'creator', label: 'Content Creator' },
    { key: 'byline', label: 'By-line Attribution' },
    { key: 'xpauthor', label: 'Windows Author Tag' }
  ];

  let hasPersonalInfo = false;
  for (const item of personalKeys) {
    if (searchValues[item.key] && searchValues[item.key].value) {
      hasPersonalInfo = true;
      issues.push({
        id: `pii-${item.key}`,
        severity: 'LOW',
        title: item.label,
        description: `Identifies creator personal name or handle. Keep if intending copyright attribution.`,
        tagKey: searchValues[item.key].key,
        value: String(searchValues[item.key].value),
        category: 'PERSONAL'
      });
    }
  }

  // Calculate score (0 = clean, 100 = critical threat)
  let score = 0;
  if (hasGps) score += 55;
  if (hasDeviceSerial) score += 25;
  if (hasSoftwareInfo) score += 12;
  if (hasPersonalInfo) score += 8;

  score = Math.min(100, score);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (hasGps || score >= 60) {
    riskLevel = 'HIGH';
  } else if (score >= 20) {
    riskLevel = 'MEDIUM';
  }

  return {
    score,
    riskLevel,
    issues,
    hasGps,
    hasDeviceSerial,
    hasPersonalInfo,
    hasSoftwareInfo
  };
}

export function getGpsCoordinates(raw: Record<string, any>): { lat?: number; lon?: number } {
  const gps = raw.gps || raw.GPS || raw.exif || raw;
  const coordinate = (value: any, ref: any): number | undefined => {
    let result = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (Array.isArray(value) && value.length === 3) {
      const n = (item: any) => Array.isArray(item) ? Number(item[0]) / Number(item[1]) : Number(item);
      result = n(value[0]) + n(value[1]) / 60 + n(value[2]) / 3600;
    }
    if (ref === 'S' || ref === 'W') result = -Math.abs(result);
    return Number.isFinite(result) ? result : undefined;
  };
  const lat = coordinate(raw.latitude ?? gps.latitude ?? gps.GPSLatitude, gps.GPSLatitudeRef);
  const lon = coordinate(raw.longitude ?? gps.longitude ?? gps.GPSLongitude, gps.GPSLongitudeRef);
  return { lat: lat !== undefined && Math.abs(lat) <= 90 ? lat : undefined, lon: lon !== undefined && Math.abs(lon) <= 180 ? lon : undefined };
}
