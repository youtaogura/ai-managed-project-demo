import type { NewRecordInput } from '../types/record';
import { SPINE_COLORS } from './constants';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidRating(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 1 || value > 5) return false;
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isValidDateRange(start: unknown, end: unknown): boolean {
  if (start !== null && !isValidDateString(start)) return false;
  if (end !== null && !isValidDateString(end)) return false;
  if (typeof start === 'string' && typeof end === 'string') return end >= start;
  return true;
}

export function isValidRecordInput(
  input: Pick<NewRecordInput, 'title' | 'rating' | 'startDate' | 'endDate' | 'spineColor'>,
): boolean {
  return (
    (input.spineColor === undefined || (SPINE_COLORS as readonly string[]).includes(input.spineColor)) &&
    input.title.trim().length > 0 &&
    isValidRating(input.rating) &&
    isValidDateRange(input.startDate, input.endDate)
  );
}
