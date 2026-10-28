import type { KeyValueStorage } from './storage';
import type { WriteCard, WriteDraft } from './writeSession';

export const WRITE_DRAFT_KEY_PREFIX = 'writeDraft.v1.';

export type WriteDraftStore = {
  load(recordId: string): Promise<WriteDraft | null>;
  save(recordId: string, draft: WriteDraft): Promise<void>;
  clear(recordId: string): Promise<void>;
};

const keyOf = (recordId: string) => `${WRITE_DRAFT_KEY_PREFIX}${recordId}`;

/** 前の版の下書き（starterId・page・asQuote があった）も、余分な項目を捨てて読む。 */
function toCard(value: unknown): WriteCard | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.key !== 'string' ||
    (v.kind !== 'starter' && v.kind !== 'free') ||
    typeof v.starter !== 'string' ||
    typeof v.text !== 'string'
  ) {
    return null;
  }
  return { key: v.key, kind: v.kind, starter: v.starter, text: v.text };
}

export function toWriteDraft(value: unknown): WriteDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.oneLiner !== 'string' || !Array.isArray(v.cards)) return null;
  if (v.selectedKey !== null && typeof v.selectedKey !== 'string') return null;
  const cards = v.cards.map(toCard).filter((card): card is WriteCard => card !== null);
  const selectedKey = cards.find((card) => card.key === v.selectedKey)?.key ?? null;
  return { oneLiner: v.oneLiner, cards, selectedKey };
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
