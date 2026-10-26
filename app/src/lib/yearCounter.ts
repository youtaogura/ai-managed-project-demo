import type { MediaRecord } from '../types/record';
import { completionDate } from './completion';
import { ALL_FIELDS_ENABLED, type EnabledFields } from './recordFields';

export type CompletionCounts = { year: number; month: number };

// 完了した日（YYYY-MM-DD）が今年・今月にある記録の数
export function countCompletions(
  records: readonly MediaRecord[],
  now: Date,
  enabledFields: EnabledFields = ALL_FIELDS_ENABLED,
): CompletionCounts {
  const yearPrefix = String(now.getFullYear()).padStart(4, '0');
  const monthPrefix = `${yearPrefix}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let year = 0;
  let month = 0;
  for (const record of records) {
    const date = completionDate(record, enabledFields);
    if (date === null) continue;
    if (date.startsWith(`${yearPrefix}-`)) year += 1;
    if (date.startsWith(`${monthPrefix}-`)) month += 1;
  }
  return { year, month };
}

// 完了した日の新しい順に最大 limit 件
export function recentlyFinished(
  records: readonly MediaRecord[],
  limit: number,
  enabledFields: EnabledFields = ALL_FIELDS_ENABLED,
): MediaRecord[] {
  return records
    .map((record) => ({ record, date: completionDate(record, enabledFields) }))
    .filter((entry) => entry.date !== null)
    .sort(
      (a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '') ||
        b.record.createdAt.localeCompare(a.record.createdAt),
    )
    .slice(0, limit)
    .map((entry) => entry.record);
}
