import { makeRecord } from '../../testUtils';
import { aggregateMonthlyCompletions, formatAverage, summarizeRatings } from '../analytics';

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

  it('種別別・合計を数え、範囲外・非 completed は除く', () => {
    const { months, undatedCompleted } = aggregateMonthlyCompletions(
      [
        done('2025-11-01', { kind: 'book' }),
        done('2026-10-31', { kind: 'movie' }),
        done('2026-10-02', { kind: 'movie' }),
        done('2025-10-31'),
        done('2026-11-01'),
        makeRecord({ status: 'in_progress', endDate: '2026-10-05' }),
      ],
      now,
    );
    expect(months[0].total).toBe(1);
    expect(months[0].byKind.book).toBe(1);
    expect(months[11].total).toBe(2);
    expect(months[11].byKind.movie).toBe(2);
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

describe('summarizeRatings', () => {
  it('バケットの境界と未評価の除外', () => {
    const r = summarizeRatings([
      makeRecord({ rating: 1.0 }),
      makeRecord({ rating: 1.9 }),
      makeRecord({ rating: 2.0 }),
      makeRecord({ rating: 5.0 }),
      makeRecord({ rating: 0.5 }),
      makeRecord({ rating: null }),
    ]);
    expect(r.distribution).toEqual({ 1: 2, 2: 1, 3: 0, 4: 0, 5: 1 });
    expect(r.count).toBe(4);
  });

  it('平均は小数第 2 位を四捨五入し、種別ごとにも出す', () => {
    const r = summarizeRatings([
      makeRecord({ kind: 'book', rating: 3 }),
      makeRecord({ kind: 'book', rating: 3.5 }),
      makeRecord({ kind: 'movie', rating: 3.5 }),
      makeRecord({ kind: 'movie', rating: 3.5 }),
      makeRecord({ kind: 'anime', rating: 2.9 }),
    ]);
    expect(r.average).toBe(3.3);
    expect(r.byKind.book).toEqual({ count: 2, average: 3.3 });
    expect(r.byKind.movie).toEqual({ count: 2, average: 3.5 });
    expect(r.byKind.manga).toBeUndefined();
  });

  it('0 件の平均は null', () => {
    const r = summarizeRatings([makeRecord()]);
    expect(r.average).toBeNull();
    expect(formatAverage(r.average)).toBe('—');
  });
});

describe('formatAverage', () => {
  it('小数第 1 位の文字列にする', () => {
    expect(formatAverage(3.3)).toBe('3.3');
    expect(formatAverage(4)).toBe('4.0');
  });
});
