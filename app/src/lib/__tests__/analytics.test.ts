import { makeRecord } from '../../testUtils';
import {
  aggregateMonthlyCompletions,
  formatAverage,
  formatPeriod,
  monthLabel,
} from '../analytics';

const now = new Date(2026, 9, 15);
const done = (endDate: string | null, extra = {}) =>
  makeRecord({ status: 'completed', endDate, ...extra });

describe('aggregateMonthlyCompletions', () => {
  it('当月末尾の 12 か月を古い順に返す（年またぎ）', () => {
    const { months } = aggregateMonthlyCompletions([], now);
    expect(months).toHaveLength(12);
    expect(months[0].month).toBe('2025-11');
    expect(months[2].month).toBe('2026-01');
    expect(months[11].month).toBe('2026-10');
    expect(months.every((m) => m.total === 0)).toBe(true);
  });

  it('月ごとの合計を数え、範囲外・非 completed は除く', () => {
    const { months, undatedCompleted } = aggregateMonthlyCompletions(
      [
        done('2025-11-01'),
        done('2026-10-31'),
        done('2026-10-02'),
        done('2025-10-31'),
        done('2026-11-01'),
        makeRecord({ status: 'in_progress', endDate: '2026-10-05' }),
      ],
      now,
    );
    expect(months[0].total).toBe(1);
    expect(months[11].total).toBe(2);
    expect(undatedCompleted).toBe(0);
  });

  it('終了日が null / 不正な完了記録は undatedCompleted に数える', () => {
    const { months, undatedCompleted } = aggregateMonthlyCompletions(
      [done(null), done('2026/10/01'), done('2026-10')],
      now,
    );
    expect(undatedCompleted).toBe(3);
    expect(months.every((m) => m.total === 0)).toBe(true);
  });
});

describe('formatAverage', () => {
  it('小数第 1 位の文字列にする', () => {
    expect(formatAverage(3.3)).toBe('3.3');
    expect(formatAverage(4)).toBe('4.0');
  });
});

describe('formatPeriod / monthLabel', () => {
  it('対象期間を「YYYY/MM – YYYY/MM」にする（年またぎ）', () => {
    expect(formatPeriod(aggregateMonthlyCompletions([], now).months)).toBe('2025/11 – 2026/10');
    expect(formatPeriod([])).toBe('');
  });

  it('月ラベルは「N月」', () => {
    expect(monthLabel('2026-10')).toBe('10月');
    expect(monthLabel('2026-01')).toBe('1月');
  });
});
