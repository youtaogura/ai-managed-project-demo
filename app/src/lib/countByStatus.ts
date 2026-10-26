import type { MediaRecord } from '../types/record';

export type StatusFilter = 'all' | 'in_progress' | 'completed' | 'planned';

/** ステータスのタブに出す件数。途中でやめた本は「すべて」にだけ数える。 */
export function countByStatus(records: readonly MediaRecord[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: records.length,
    in_progress: 0,
    completed: 0,
    planned: 0,
  };
  for (const record of records) {
    if (record.status !== 'dropped') counts[record.status] += 1;
  }
  return counts;
}

export function filterByStatus(
  records: readonly MediaRecord[],
  filter: StatusFilter,
): MediaRecord[] {
  return filter === 'all' ? [...records] : records.filter((r) => r.status === filter);
}
