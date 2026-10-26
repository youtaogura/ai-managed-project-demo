const REFERENCE = /process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g;

export function findEnvReferences(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(REFERENCE)) names.add(match[1]);
  return [...names];
}

export function parseEnvExample(text: string): { name: string; value: string }[] {
  const entries: { name: string; value: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    entries.push({ name: line.slice(0, eq).trim(), value: line.slice(eq + 1).trim() });
  }
  return entries;
}
