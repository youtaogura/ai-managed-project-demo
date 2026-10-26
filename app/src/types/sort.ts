import type { RecordFieldKey } from './settings';

export const SORT_ORDERS = [
  'endDate_desc',
  'endDate_asc',
  'startDate_desc',
  'startDate_asc',
  'rating_desc',
  'rating_asc',
  'title_asc',
  'createdAt_desc',
] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_SORT_ORDER: SortOrder = 'endDate_desc';

/** その並び順を使うのに必要な項目。ここにない並び順は常に使える。 */
export const SORT_ORDER_REQUIRES: Partial<Record<SortOrder, RecordFieldKey>> = {
  endDate_desc: 'endDate',
  endDate_asc: 'endDate',
  startDate_desc: 'startDate',
  startDate_asc: 'startDate',
  rating_desc: 'rating',
  rating_asc: 'rating',
};

/** 並び・表示に使う並び順。オフの項目の並び順は初期の並び順に戻す（保存値は変えない）。 */
export function effectiveSortOrder(
  order: SortOrder,
  enabledFields: Record<RecordFieldKey, boolean>,
): SortOrder {
  const required = SORT_ORDER_REQUIRES[order];
  if (required === undefined || enabledFields[required]) return order;
  return enabledFields.endDate ? DEFAULT_SORT_ORDER : 'createdAt_desc';
}

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && (SORT_ORDERS as readonly string[]).includes(value);
}
