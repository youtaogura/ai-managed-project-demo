export type DateParts = { y: number; m: number; d: number };
export type DatePart = keyof DateParts;

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

export function parseDateParts(value: string): DateParts | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function formatDateParts({ y, m, d }: DateParts): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → 'M/D'（先頭の 0 なし）。不正な値は null */
export function formatMonthDay(value: string): string | null {
  const parts = parseDateParts(value);
  return parts ? `${parts.m}/${parts.d}` : null;
}

/** 'YYYY-MM-DD' → 'YYYY/MM/DD'。空や不正な値はそのまま返す */
export function formatDateDisplay(value: string): string {
  const parts = parseDateParts(value);
  return parts ? formatDateParts(parts).replace(/-/g, '/') : value;
}

function wrap(value: number, min: number, max: number): number {
  if (value < min) return max;
  if (value > max) return min;
  return value;
}

/** 年・月・日のどれかを増減する。月・日は範囲内で循環し、日は月の末日にクランプする */
export function shiftDateParts(parts: DateParts, part: DatePart, delta: number): DateParts {
  let { y, m, d } = parts;
  if (part === 'y') y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, y + delta));
  if (part === 'm') m = wrap(m + delta, 1, 12);
  const last = daysInMonth(y, m);
  if (part === 'd') d = wrap(d + delta, 1, last);
  return { y, m, d: Math.min(d, last) };
}
