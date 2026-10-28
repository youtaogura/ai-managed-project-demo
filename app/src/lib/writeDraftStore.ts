import type { KeyValueStorage } from './storage';
import type { WriteDraft } from './writeSession';

/** v1 はカードの形の下書き（#182 で 1 つの入力欄に作り直した）。形が違うので読まない。 */
export const WRITE_DRAFT_KEY_PREFIX = 'writeDraft.v2.';

export type WriteDraftStore = {
  load(recordId: string): Promise<WriteDraft | null>;
  save(recordId: string, draft: WriteDraft): Promise<void>;
  clear(recordId: string): Promise<void>;
};

const keyOf = (recordId: string) => `${WRITE_DRAFT_KEY_PREFIX}${recordId}`;

const toStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function toWriteDraft(value: unknown): WriteDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.oneLiner !== 'string' || typeof v.text !== 'string') return null;
  return { oneLiner: v.oneLiner, text: v.text, hints: toStrings(v.hints), usedHints: toStrings(v.usedHints) };
}

export function createWriteDraftStore(storage: KeyValueStorage): WriteDraftStore {
  return {
    load: async (recordId) => {
      try {
        const raw = await storage.getItem(keyOf(recordId));
        if (raw === null) return null;
        return toWriteDraft(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save: (recordId, draft) => storage.setItem(keyOf(recordId), JSON.stringify(draft)),
    clear: (recordId) => storage.removeItem(keyOf(recordId)),
  };
}
