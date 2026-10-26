import { STARTER_COUNT_OPTIONS, type StarterItem, type StarterSettings } from '../types/starter';
import { defaultStarterSettings } from './starterDefaults';
import type { KeyValueStorage } from './storage';

export const STARTER_SETTINGS_STORAGE_KEY = 'starterSettings.v1';

export type StarterSettingsStore = {
  load(): Promise<StarterSettings>;
  save(settings: StarterSettings): Promise<void>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toItem(value: unknown): StarterItem | null {
  if (!isObject(value)) return null;
  const { id, text, enabled, custom } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (typeof text !== 'string' || text.trim() === '') return null;
  if (typeof enabled !== 'boolean' || typeof custom !== 'boolean') return null;
  return { id, text, enabled, custom };
}

/** 項目ごとに検証し、不正なものは既定値にする（不正な items 要素は捨てる）。 */
export function parseStarterSettings(raw: unknown): StarterSettings {
  const result = defaultStarterSettings();
  if (!isObject(raw)) return result;
  if (typeof raw.enabled === 'boolean') result.enabled = raw.enabled;
  const count = STARTER_COUNT_OPTIONS.find((c) => c === raw.count);
  if (count) result.count = count;
  if (Array.isArray(raw.items)) {
    const seen = new Set<string>();
    const items: StarterItem[] = [];
    for (const value of raw.items) {
      const item = toItem(value);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
    result.items = items;
  }
  return result;
}

export function createStarterSettingsStore(storage: KeyValueStorage): StarterSettingsStore {
  return {
    load: async () => {
      try {
        const raw = await storage.getItem(STARTER_SETTINGS_STORAGE_KEY);
        return parseStarterSettings(raw === null ? null : JSON.parse(raw));
      } catch {
        return defaultStarterSettings();
      }
    },
    save: (settings) => storage.setItem(STARTER_SETTINGS_STORAGE_KEY, JSON.stringify(settings)),
  };
}
