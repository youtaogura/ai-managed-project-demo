import type { FreeTextEntry, MediaRecord, StarterEntry } from '../types/record';

export type RereadEntry =
  | { kind: 'starter'; entry: StarterEntry }
  | { kind: 'free'; entry: FreeTextEntry };

type RereadSource = Pick<MediaRecord, 'starters' | 'freeTexts'>;

/** 書き出しの続き・自由記述を書いた順に並べる。本文が空のものは除く。 */
export function buildRereadEntries(record: RereadSource): RereadEntry[] {
  const items: RereadEntry[] = [
    ...record.starters.filter((e) => e.text.trim() !== '').map((entry): RereadEntry => ({ kind: 'starter', entry })),
    ...record.freeTexts.filter((e) => e.text.trim() !== '').map((entry): RereadEntry => ({ kind: 'free', entry })),
  ];
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const x = a.item.entry.createdAt;
      const y = b.item.entry.createdAt;
      if (x !== y) return x < y ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/** ひとこと・書き出しの続き・引用・自由記述・メモのどれもなければ false。 */
export function hasRereadContent(
  record: Pick<MediaRecord, 'oneLiner' | 'starters' | 'quotes' | 'freeTexts' | 'memos'>,
): boolean {
  return (
    (record.oneLiner ?? '').trim() !== '' ||
    buildRereadEntries(record).length > 0 ||
    record.quotes.some((q) => q.text.trim() !== '') ||
    record.memos.some((m) => m.text.trim() !== '')
  );
}
