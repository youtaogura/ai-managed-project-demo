import { parseDateParts } from './date';
import type { MediaRecord } from '../types/record';

const md = (value: string | null): string | null => {
  const p = value ? parseDateParts(value) : null;
  return p ? `${p.m}/${p.d}` : null;
};

/**
 * 本の画面の上部に出す、ステータスと日付の 1 行（朱）。
 * 例: 「読んでる · 10/18 から」「読んだ · 10/1 – 10/20」「読みたい」「途中でやめた · 10/5 まで」
 */
export function buildStatusLine(record: Pick<MediaRecord, 'status' | 'startDate' | 'endDate'>): string {
  const start = md(record.startDate);
  const end = md(record.endDate);
  switch (record.status) {
    case 'in_progress':
      return start ? `読んでる · ${start} から` : '読んでる';
    case 'completed':
      if (start && end) return start === end ? `読んだ · ${end}` : `読んだ · ${start} – ${end}`;
      return end ? `読んだ · ${end}` : '読んだ';
    case 'dropped':
      return end ? `途中でやめた · ${end} まで` : '途中でやめた';
    default:
      return '読みたい';
  }
}
