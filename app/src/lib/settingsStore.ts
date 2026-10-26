import { MEDIA_KINDS, type MediaKind } from '../types/record';
import {
  DEFAULT_SETTINGS,
  RECORD_FIELDS,
  HERO_CRITERIA_IDS,
  type AppSettings,
  type HeroCriterion,
} from '../types/settings';
import type { KeyValueStorage } from './storage';

export const SETTINGS_STORAGE_KEY = 'appSettings.v1';

export type SettingsStore = {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
};

function defaults(): AppSettings {
  return {
    enabledKinds: [...DEFAULT_SETTINGS.enabledKinds],
    enabledFields: { ...DEFAULT_SETTINGS.enabledFields },
    heroCriterion: DEFAULT_SETTINGS.heroCriterion,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 未知の種別を捨て、重複を除き、MEDIA_KINDS の順にそろえる。1 つも残らなければ null
function parseEnabledKinds(value: unknown): MediaKind[] | null {
  if (!Array.isArray(value)) return null;
  const kinds = MEDIA_KINDS.filter((kind) => value.includes(kind));
  return kinds.length > 0 ? kinds : null;
}

function parseHeroCriterion(value: unknown): HeroCriterion | null {
  return HERO_CRITERIA_IDS.find((id) => id === value) ?? null;
}

/** フィールドごとに検証し、不正なフィールドだけ既定値にする。 */
export function parseSettings(raw: string | null): AppSettings {
  const result = defaults();
  if (raw === null) return result;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return result;
  }
  if (!isRecord(parsed)) return result;
  const enabledKinds = parseEnabledKinds(parsed.enabledKinds);
  if (enabledKinds) result.enabledKinds = enabledKinds;
  if (isRecord(parsed.enabledFields)) {
    for (const key of RECORD_FIELDS) {
      const value = parsed.enabledFields[key];
      if (typeof value === 'boolean') result.enabledFields[key] = value;
    }
  }
  const heroCriterion = parseHeroCriterion(parsed.heroCriterion);
  if (heroCriterion) result.heroCriterion = heroCriterion;
  return result;
}

export function createSettingsStore(storage: KeyValueStorage): SettingsStore {
  return {
    load: async () => {
      try {
        return parseSettings(await storage.getItem(SETTINGS_STORAGE_KEY));
      } catch {
        return defaults();
      }
    },
    save: (settings) => storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)),
  };
}
