import { makeRecord } from '../../testUtils';
import { countCompletions, recentlyFinished } from '../yearCounter';

describe('countCompletions', () => {
  const now = new Date(2026, 9, 15);

  it('今年・今月に終了日がある記録だけ数える', () => {
    const records = [
      makeRecord({ id: '1', endDate: '2026-10-01' }),
      makeRecord({ id: '2', endDate: '2026-03-02' }),
      makeRecord({ id: '3', endDate: '2025-10-05' }),
      makeRecord({ id: '4', endDate: null }),
    ];
    expect(countCompletions(records, now)).toEqual({ year: 2, month: 1 });
  });

  it('記録がなければ 0', () => {
    expect(countCompletions([], now)).toEqual({ year: 0, month: 0 });
  });
});

describe('recentlyFinished', () => {
  it('終了日の新しい順に limit 件まで、終了日なしは除く', () => {
    const records = [
      makeRecord({ id: 'a', endDate: '2024-01-01' }),
      makeRecord({ id: 'b', endDate: '2024-03-01' }),
      makeRecord({ id: 'c', endDate: null }),
      makeRecord({ id: 'd', endDate: '2024-02-01' }),
    ];
    expect(recentlyFinished(records, 2).map((r) => r.id)).toEqual(['b', 'd']);
  });
});

describe('終えた日がオフ', () => {
  const off = {
    rating: true,
    status: true,
    startDate: true,
    endDate: false,
    review: true,
    photo: true,
  };
  const created = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();
  const records = [
    makeRecord({
      id: 'a',
      status: 'completed',
      endDate: '2000-01-01',
      createdAt: created(2026, 10, 2),
    }),
    makeRecord({ id: 'b', status: 'completed', endDate: null, createdAt: created(2026, 3, 2) }),
    makeRecord({
      id: 'c',
      status: 'planned',
      endDate: '2026-10-01',
      createdAt: created(2026, 10, 5),
    }),
    makeRecord({ id: 'd', status: 'completed', endDate: null, createdAt: created(2025, 10, 5) }),
  ];

  it('完了済みの記録を登録日で数える', () => {
    expect(countCompletions(records, new Date(2026, 9, 15), off)).toEqual({ year: 2, month: 1 });
  });

  it('完了済みの記録を登録日の新しい順に出す', () => {
    expect(recentlyFinished(records, 10, off).map((r) => r.id)).toEqual(['a', 'b', 'd']);
  });

  it('完了済みがなければ空', () => {
    expect(recentlyFinished([records[2]].filter(Boolean) as typeof records, 10, off)).toEqual([]);
  });
});
