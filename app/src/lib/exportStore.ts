import type { KeyValueStorage } from './storage';

export const LAST_EXPORTED_AT_KEY = 'lastExportedAt.v1';

export type ExportStore = {
  loadLastExportedAt(): Promise<string | null>;
  saveLastExportedAt(iso: string): Promise<void>;
};

export function createExportStore(storage: KeyValueStorage): ExportStore {
  return {
    loadLastExportedAt: async () => {
      try {
        const raw = await storage.getItem(LAST_EXPORTED_AT_KEY);
        if (raw === null || Number.isNaN(new Date(raw).getTime())) return null;
        return raw;
      } catch {
        return null;
      }
    },
    saveLastExportedAt: (iso) => storage.setItem(LAST_EXPORTED_AT_KEY, iso),
  };
}
