import { sourceFromIsbn } from './recordSource';
import type { KeyValueStorage } from './storage';

export const RECORDS_KEY = 'records.v1';
export const SCHEMA_VERSION_STORAGE_KEY = 'records.schemaVersion';
export const CURRENT_SCHEMA_VERSION = 2;

type Migration = { to: number; run: (rawItems: unknown[]) => unknown[] };

function addSource(item: unknown): unknown {
  if (typeof item !== 'object' || item === null || Array.isArray(item) || 'source' in item) {
    return item;
  }
  const isbn = (item as Record<string, unknown>).isbn;
  return { ...item, source: sourceFromIsbn(typeof isbn === 'string' ? isbn : null) };
}

// 版ごとの移行。今後の移行はここに { to, run } を足す
export const MIGRATIONS: Migration[] = [{ to: 2, run: (rawItems) => rawItems.map(addSource) }];

export async function migrateRecords(storage: KeyValueStorage): Promise<boolean> {
  try {
    const stored = Number(await storage.getItem(SCHEMA_VERSION_STORAGE_KEY));
    const version = Number.isInteger(stored) ? stored : 0;
    if (version >= CURRENT_SCHEMA_VERSION) return true;

    const raw = await storage.getItem(RECORDS_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return false;
      let items: unknown[] = parsed;
      for (const migration of MIGRATIONS) {
        if (migration.to > version) items = migration.run(items);
      }
      if (items.some((item, i) => item !== parsed[i])) {
        await storage.setItem(RECORDS_KEY, JSON.stringify(items));
      }
    }
    await storage.setItem(SCHEMA_VERSION_STORAGE_KEY, String(CURRENT_SCHEMA_VERSION));
    return true;
  } catch {
    return false;
  }
}
