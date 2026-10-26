import type { MediaRecord } from '../types/record';
import { parseDateParts } from './date';

/** 言葉の目安。判定は getRatingWord が持つ。 */
export const RATING_GUIDE = [
  { word: '最高', range: '5.0' },
  { word: 'よかった', range: '4.0〜4.9' },
  { word: 'まあまあ', range: '3.0〜3.9' },
  { word: 'あんまり', range: '〜2.9' },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 両端を含む日数。どちらかが読めない、または終了が開始より前なら null。 */
export function daysBetween(start: string, end: string): number | null {
  const s = parseDateParts(start);
  const e = parseDateParts(end);
  if (!s || !e) return null;
  const diff = Math.round((Date.UTC(e.y, e.m - 1, e.d) - Date.UTC(s.y, s.m - 1, s.d)) / DAY_MS);
  return diff < 0 ? null : diff + 1;
}

export function buildFinishedSummary(
  record: Pick<MediaRecord, 'startDate' | 'endDate' | 'memos'>,
): string {
  const memos = `メモ ${record.memos.length} 件`;
  const end = record.endDate ? parseDateParts(record.endDate) : null;
  if (!end) return memos;
  const endLabel = `${end.m}/${end.d}`;
  const start = record.startDate ? parseDateParts(record.startDate) : null;
  if (!start) return `${endLabel} · ${memos}`;
  const days = daysBetween(record.startDate ?? '', record.endDate ?? '');
  const parts = [`${start.m}/${start.d} – ${endLabel}`];
  if (days !== null) parts.push(`${days} 日間`);
  parts.push(memos);
  return parts.join(' · ');
}
