import type { MediaRecord } from '../types/record';

export type CompletionCounts = { year: number; month: number };

// 終了日（YYYY-MM-DD）が今年・今月にある記録の数
export function countCompletions(records: readonly MediaRecord[], now: Date): CompletionCounts {
  const yearPrefix = String(now.getFullYear()).padStart(4, '0');
  const monthPrefix = `${yearPrefix}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let year = 0;
  let month = 0;
  for (const record of records) {
    if (record.endDate === null) continue;
    if (record.endDate.startsWith(`${yearPrefix}-`)) year += 1;
    if (record.endDate.startsWith(`${monthPrefix}-`)) month += 1;
  }
  return { year, month };
}
