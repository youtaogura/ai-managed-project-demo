import type { NoteDraft } from './notes';
import type { KeyValueStorage } from './storage';

export const NOTE_DRAFT_KEY_PREFIX = 'noteDraft.v1.';

export type NoteDraftStore = {
  load(recordId: string): Promise<NoteDraft | null>;
  save(recordId: string, draft: NoteDraft): Promise<void>;
  clear(recordId: string): Promise<void>;
};

const keyOf = (recordId: string) => `${NOTE_DRAFT_KEY_PREFIX}${recordId}`;

export function isNoteDraft(value: unknown): value is NoteDraft {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.kind === 'memo' || v.kind === 'quote') &&
    typeof v.page === 'string' &&
    typeof v.text === 'string' &&
    typeof v.comment === 'string'
  );
}

export function createNoteDraftStore(storage: KeyValueStorage): NoteDraftStore {
  return {
    load: async (recordId) => {
      try {
        const raw = await storage.getItem(keyOf(recordId));
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!isNoteDraft(parsed)) return null;
        return { kind: parsed.kind, page: parsed.page, text: parsed.text, comment: parsed.comment };
      } catch {
        return null;
      }
    },
    save: (recordId, draft) => storage.setItem(keyOf(recordId), JSON.stringify(draft)),
    clear: (recordId) => storage.removeItem(keyOf(recordId)),
  };
}
