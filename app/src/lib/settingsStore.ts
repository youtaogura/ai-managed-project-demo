import { RECORD_STATUSES, type RecordStatus } from '../types/record';
import {
  DEFAULT_SETTINGS,
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
    heroCriterion: DEFAULT_SETTINGS.heroCriterion,
    defaultStatus: DEFAULT_SETTINGS.defaultStatus,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseHeroCriterion(value: unknown): HeroCriterion | null {
  return HERO_CRITERIA_IDS.find((id) => id === value) ?? null;
}

function parseDefaultStatus(value: unknown): RecordStatus | null {
  return RECORD_STATUSES.find((status) => status === value) ?? null;
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
  const heroCriterion = parseHeroCriterion(parsed.heroCriterion);
  if (heroCriterion) result.heroCriterion = heroCriterion;
  const defaultStatus = parseDefaultStatus(parsed.defaultStatus);
  if (defaultStatus) result.defaultStatus = defaultStatus;
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
