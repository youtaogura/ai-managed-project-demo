import type { FreeTextEntry, MediaRecord, QuoteEntry, StarterEntry } from '../types/record';
import { parseDateParts, type DateParts } from './date';

export type RereadEntry =
  | { kind: 'starter'; entry: StarterEntry }
  | { kind: 'quote'; entry: QuoteEntry }
  | { kind: 'free'; entry: FreeTextEntry };

type RereadSource = Pick<MediaRecord, 'starters' | 'quotes' | 'freeTexts'>;

/** 書き出しの続き・引用・自由記述を書いた順に並べる。本文が空のものは除く。 */
export function buildRereadEntries(record: RereadSource): RereadEntry[] {
  const items: RereadEntry[] = [
    ...record.starters.filter((e) => e.text.trim() !== '').map((entry): RereadEntry => ({ kind: 'starter', entry })),
    ...record.quotes.filter((e) => e.text.trim() !== '').map((entry): RereadEntry => ({ kind: 'quote', entry })),
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

function md({ m, d }: DateParts): string {
  return `${m}/${d}`;
}

function ymd({ y, m, d }: DateParts): string {
  return `${y}/${m}/${d}`;
}

/** 「2026/10/1–10/20」の形。日付がなければ null。 */
export function buildRereadPeriod(record: Pick<MediaRecord, 'startDate' | 'endDate'>): string | null {
  const start = record.startDate ? parseDateParts(record.startDate) : null;
  const end = record.endDate ? parseDateParts(record.endDate) : null;
  if (start && end) {
    if (start.y === end.y && start.m === end.m && start.d === end.d) return ymd(start);
    return `${ymd(start)}–${start.y === end.y ? md(end) : ymd(end)}`;
  }
  if (start) return `${ymd(start)} から`;
  if (end) return ymd(end);
  return null;
}

/** ひとこと・書き出しの続き・引用・自由記述・メモのどれもなければ false。 */
export function hasRereadContent(
  record: Pick<MediaRecord, 'oneLiner' | 'starters' | 'quotes' | 'freeTexts' | 'memos'>,
): boolean {
  return (
    (record.oneLiner ?? '').trim() !== '' ||
    buildRereadEntries(record).length > 0 ||
    record.memos.some((m) => m.text.trim() !== '')
  );
}
