import {
  daysInMonth,
  formatDateDisplay,
  formatDateParts,
  parseDateParts,
  shiftDateParts,
} from '../date';

describe('daysInMonth', () => {
  it('月末日を返す（うるう年を含む）', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 4)).toBe(30);
    expect(daysInMonth(2024, 12)).toBe(31);
  });
});

describe('parseDateParts / formatDateParts', () => {
  it('YYYY-MM-DD を分解・整形できる', () => {
    expect(parseDateParts('2026-10-01')).toEqual({ y: 2026, m: 10, d: 1 });
    expect(formatDateParts({ y: 2026, m: 1, d: 5 })).toBe('2026-01-05');
  });

  it('不正な値は null', () => {
    expect(parseDateParts('')).toBeNull();
    expect(parseDateParts('2024-02-30')).toBeNull();
    expect(parseDateParts('2024-13-01')).toBeNull();
    expect(parseDateParts('2024-00-10')).toBeNull();
  });
});

describe('formatDateDisplay', () => {
  it('スラッシュ区切りで表示し、不正な値はそのまま返す', () => {
    expect(formatDateDisplay('2026-10-01')).toBe('2026/10/01');
    expect(formatDateDisplay('abc')).toBe('abc');
  });
});

describe('shiftDateParts', () => {
  it('日・月は範囲内で循環する', () => {
    expect(shiftDateParts({ y: 2024, m: 1, d: 31 }, 'd', 1)).toEqual({ y: 2024, m: 1, d: 1 });
    expect(shiftDateParts({ y: 2024, m: 1, d: 1 }, 'd', -1)).toEqual({ y: 2024, m: 1, d: 31 });
    expect(shiftDateParts({ y: 2024, m: 12, d: 1 }, 'm', 1)).toEqual({ y: 2024, m: 1, d: 1 });
    expect(shiftDateParts({ y: 2024, m: 1, d: 1 }, 'm', -1)).toEqual({ y: 2024, m: 12, d: 1 });
  });

  it('日は月の末日にクランプされる', () => {
    expect(shiftDateParts({ y: 2024, m: 1, d: 31 }, 'm', 1)).toEqual({ y: 2024, m: 2, d: 29 });
    expect(shiftDateParts({ y: 2024, m: 2, d: 29 }, 'y', 1)).toEqual({ y: 2025, m: 2, d: 28 });
  });

  it('年は範囲内に収まる', () => {
    expect(shiftDateParts({ y: 1900, m: 1, d: 1 }, 'y', -1).y).toBe(1900);
    expect(shiftDateParts({ y: 2100, m: 1, d: 1 }, 'y', 1).y).toBe(2100);
  });
});
