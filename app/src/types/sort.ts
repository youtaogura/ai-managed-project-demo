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

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && (SORT_ORDERS as readonly string[]).includes(value);
}
