import type { MediaRecord, SpineColor } from '../types/record';
import { aggregateMonthlyCompletions, average, formatPeriod } from './analytics';
import { STARTER_FIXED } from './constants';
import { getRatingWord } from './ratingWord';

export type RatingBucketLabel = '最高' | 'よかった' | 'まあまあ' | 'あんまり';

export type ReviewSummary = {
  period: string;
  read: number;
  impressions: number;
  quotes: number;
  months: { month: string; books: { id: string; spineColor: SpineColor }[] }[];
  favorites: MediaRecord[];
  ratings: {
    average: number | null;
    word: string | null;
    buckets: { label: RatingBucketLabel; count: number }[];
  };
  topStarter: { text: string; count: number } | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const BUCKET_LABELS: RatingBucketLabel[] = ['最高', 'よかった', 'まあまあ', 'あんまり'];

function endDateOf(record: MediaRecord): string | null {
  return record.endDate !== null && DATE_PATTERN.test(record.endDate) ? record.endDate : null;
}

function hasText(text: string | null): boolean {
  return text !== null && text.trim() !== '';
}

function compareOldestFirst(a: MediaRecord, b: MediaRecord): number {
  const byEnd = (endDateOf(a) ?? '').slice(0, 10).localeCompare((endDateOf(b) ?? '').slice(0, 10));
  if (byEnd !== 0) return byEnd;
  const byCreated = a.createdAt.localeCompare(b.createdAt);
  return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id);
}

function compareNewestFirst(a: MediaRecord, b: MediaRecord): number {
  const byEnd = (endDateOf(b) ?? '').slice(0, 10).localeCompare((endDateOf(a) ?? '').slice(0, 10));
  return byEnd !== 0 ? byEnd : b.createdAt.localeCompare(a.createdAt);
}

function bucketIndex(rating: number): number {
  const tenths = Math.round(rating * 10);
  if (tenths >= 50) return 0;
  if (tenths >= 40) return 1;
  if (tenths >= 30) return 2;
  return 3;
}

/** 振り返り画面の集計。期間は当月を含む直近 12 か月、今年は now の暦年。 */
export function summarizeReview(records: MediaRecord[], now: Date): ReviewSummary {
  const { months: slots } = aggregateMonthlyCompletions([], now);
  const periodKeys = new Set(slots.map((m) => m.month));
  const year = String(now.getFullYear()).padStart(4, '0');

  const read = records
    .filter((r) => {
      const end = endDateOf(r);
      return r.status === 'completed' && end !== null && periodKeys.has(end.slice(0, 7));
    })
    .sort(compareOldestFirst);

  const months = slots.map((slot) => ({
    month: slot.month,
    books: read
      .filter((r) => endDateOf(r)?.slice(0, 7) === slot.month)
      .map((r) => ({ id: r.id, spineColor: r.spineColor })),
  }));

  const impressions = read.filter(
    (r) => hasText(r.oneLiner) || r.starters.some((s) => hasText(s.text)),
  ).length;
  const quotes = read.reduce((sum, r) => sum + r.quotes.length, 0);

  const inYear = (r: MediaRecord) => endDateOf(r)?.slice(0, 4) === year;
  const favorites = records.filter((r) => r.favorite && inYear(r)).sort(compareNewestFirst);

  const counts = [0, 0, 0, 0];
  let sum = 0;
  let rated = 0;
  for (const r of read) {
    if (r.rating === null) continue;
    counts[bucketIndex(r.rating)] += 1;
    sum += r.rating;
    rated += 1;
  }
  const avg = rated === 0 ? null : average(sum, rated);

  const starterCounts = new Map<string, number>();
  const bump = (text: string) => starterCounts.set(text, (starterCounts.get(text) ?? 0) + 1);
  for (const r of records.filter(inYear)) {
    if (hasText(r.oneLiner)) bump(STARTER_FIXED);
    for (const s of r.starters) if (hasText(s.text)) bump(s.starter);
  }
  let topStarter: ReviewSummary['topStarter'] = null;
  for (const [text, count] of starterCounts) {
    if (topStarter === null || count > topStarter.count) topStarter = { text, count };
  }

  return {
    period: formatPeriod(slots),
    read: read.length,
    impressions,
    quotes,
    months,
    favorites,
    ratings: {
      average: avg,
      word: getRatingWord(avg),
      buckets: BUCKET_LABELS.map((label, i) => ({ label, count: counts[i] })),
    },
    topStarter,
  };
}
