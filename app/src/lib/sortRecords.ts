import type { MediaRecord } from '../types/record';
import type { SortOrder } from '../types/sort';

export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  endDate_desc: '終了日が新しい順',
  endDate_asc: '終了日が古い順',
  startDate_desc: '開始日が新しい順',
  startDate_asc: '開始日が古い順',
  rating_desc: '評価が高い順',
  rating_asc: '評価が低い順',
  title_asc: 'タイトル順',
  createdAt_desc: '登録が新しい順',
};

const collator = new Intl.Collator('ja', {
  numeric: true,
  sensitivity: 'base',
});

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// null は昇順・降順に関わらず末尾に置く
function compareNullable<T>(
  a: T | null,
  b: T | null,
  direction: 1 | -1,
  compare: (x: T, y: T) => number,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction * compare(a, b);
}

function comparePrimary(a: MediaRecord, b: MediaRecord, order: SortOrder): number {
  switch (order) {
    case 'endDate_desc':
      return compareNullable(a.endDate, b.endDate, -1, compareText);
    case 'endDate_asc':
      return compareNullable(a.endDate, b.endDate, 1, compareText);
    case 'startDate_desc':
      return compareNullable(a.startDate, b.startDate, -1, compareText);
    case 'startDate_asc':
      return compareNullable(a.startDate, b.startDate, 1, compareText);
    case 'rating_desc':
      return compareNullable(a.rating, b.rating, -1, (x, y) => x - y);
    case 'rating_asc':
      return compareNullable(a.rating, b.rating, 1, (x, y) => x - y);
    case 'title_asc':
      return collator.compare(a.title.trim(), b.title.trim());
    case 'createdAt_desc':
      return compareText(b.createdAt, a.createdAt);
  }
}

export function sortRecords(records: readonly MediaRecord[], order: SortOrder): MediaRecord[] {
  return [...records].sort(
    (a, b) =>
      comparePrimary(a, b, order) ||
      compareText(b.createdAt, a.createdAt) ||
      compareText(a.id, b.id),
  );
}
