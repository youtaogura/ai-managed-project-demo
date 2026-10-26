export type LicenseEntry = { name: string; version: string; license: string };

function isLicenseEntry(value: unknown): value is LicenseEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === 'string' && typeof v.version === 'string' && typeof v.license === 'string';
}

export function parseLicenseList(json: unknown): LicenseEntry[] {
  if (!Array.isArray(json)) return [];
  return json.filter(isLicenseEntry).map(({ name, version, license }) => ({ name, version, license }));
}
