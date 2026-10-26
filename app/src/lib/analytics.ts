import { MEDIA_KINDS, type MediaKind, type MediaRecord } from '../types/record';

export type MonthlyCompletion = {
  month: string;
  total: number;
  byKind: Record<MediaKind, number>;
};
export type MonthlyCompletionResult = { months: MonthlyCompletion[]; undatedCompleted: number };

const MONTH_COUNT = 12;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

function emptyByKind(): Record<MediaKind, number> {
  return { book: 0, manga: 0, movie: 0, drama: 0, anime: 0 };
}

function monthKey(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function aggregateMonthlyCompletions(
  records: MediaRecord[],
  now: Date,
): MonthlyCompletionResult {
  const months: MonthlyCompletion[] = [];
  for (let i = MONTH_COUNT - 1; i >= 0; i--) {
    months.push({
      month: monthKey(now.getFullYear(), now.getMonth() - i),
      total: 0,
      byKind: emptyByKind(),
    });
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  let undatedCompleted = 0;
  for (const record of records) {
    if (record.status !== 'completed') continue;
    if (record.endDate === null || !DATE_PATTERN.test(record.endDate)) {
      undatedCompleted += 1;
      continue;
    }
    const bucket = byMonth.get(record.endDate.slice(0, 7));
    if (!bucket) continue;
    bucket.total += 1;
    bucket.byKind[record.kind] += 1;
  }
  return { months, undatedCompleted };
}

export type RatingBucket = 1 | 2 | 3 | 4 | 5;
export type RatingSummary = {
  distribution: Record<RatingBucket, number>;
  count: number;
  average: number | null;
  byKind: Partial<Record<MediaKind, { count: number; average: number }>>;
};

function average(sum: number, count: number): number {
  return Math.round((sum * 10) / count) / 10;
}

export function summarizeRatings(records: MediaRecord[]): RatingSummary {
  const distribution: Record<RatingBucket, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sums: Partial<Record<MediaKind, { count: number; sum: number }>> = {};
  let count = 0;
  let sum = 0;
  for (const record of records) {
    const rating = record.rating;
    if (rating === null || rating < 1) continue;
    const bucket = Math.min(5, Math.floor(rating)) as RatingBucket;
    distribution[bucket] += 1;
    count += 1;
    sum += rating;
    const entry = sums[record.kind] ?? { count: 0, sum: 0 };
    entry.count += 1;
    entry.sum += rating;
    sums[record.kind] = entry;
  }
  const byKind: RatingSummary['byKind'] = {};
  for (const kind of MEDIA_KINDS) {
    const entry = sums[kind];
    if (entry) byKind[kind] = { count: entry.count, average: average(entry.sum, entry.count) };
  }
  return { distribution, count, average: count === 0 ? null : average(sum, count), byKind };
}

export function formatAverage(value: number | null): string {
  return value === null ? '—' : value.toFixed(1);
}

export function summarizeYear(result: MonthlyCompletionResult): number {
  return result.months.reduce((sum, m) => sum + m.total, 0);
}

function slashMonth(month: string): string {
  return month.replace('-', '/');
}

// 例: '2025/11 – 2026/10'（半角スペース + en dash）
export function formatPeriod(months: MonthlyCompletion[]): string {
  if (months.length === 0) return '';
  return `${slashMonth(months[0].month)} – ${slashMonth(months[months.length - 1].month)}`;
}

// '2026-10' → '10月'
export function monthLabel(month: string): string {
  return `${Number(month.slice(5, 7))}月`;
}
