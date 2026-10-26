import { formatDateTime, formatPeriod, formatRating } from '../format';

describe('format', () => {
  it('期間', () => {
    expect(formatPeriod('2024-01-05', '2024-02-10')).toBe('2024-01-05 〜 2024-02-10');
    expect(formatPeriod('2024-01-05', null)).toBe('2024-01-05 〜');
    expect(formatPeriod(null, '2024-02-10')).toBe('〜 2024-02-10');
    expect(formatPeriod(null, null)).toBeNull();
  });

  it('レーティング', () => {
    expect(formatRating(4)).toBe('★ 4.0');
    expect(formatRating(3.5)).toBe('★ 3.5');
    expect(formatRating(null)).toBe('未評価');
  });

  it('日時はローカル時刻の YYYY-MM-DD HH:mm', () => {
    const d = new Date(2024, 0, 5, 9, 7);
    expect(formatDateTime(d.toISOString())).toBe('2024-01-05 09:07');
    expect(formatDateTime('invalid')).toBe('invalid');
  });
});
