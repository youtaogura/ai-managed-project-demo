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
