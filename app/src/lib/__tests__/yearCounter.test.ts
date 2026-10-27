import { makeRecord } from '../../testUtils';
import { countCompletions } from '../yearCounter';

describe('countCompletions', () => {
  const now = new Date(2026, 9, 15);

  it('今年・今月に終了日がある記録だけ数える', () => {
    const records = [
      makeRecord({ id: '1', status: 'completed', endDate: '2026-10-01' }),
      makeRecord({ id: '2', status: 'completed', endDate: '2026-03-02' }),
      makeRecord({ id: '3', status: 'completed', endDate: '2025-10-05' }),
      makeRecord({ id: '4', status: 'completed', endDate: null }),
      makeRecord({ id: '5', status: 'planned', endDate: '2026-10-02' }),
      makeRecord({ id: '6', status: 'in_progress', endDate: '2026-10-03' }),
      makeRecord({ id: '7', status: 'dropped', endDate: '2026-10-04' }),
    ];
    expect(countCompletions(records, now)).toEqual({ year: 2, month: 1 });
  });

  it('記録がなければ 0', () => {
    expect(countCompletions([], now)).toEqual({ year: 0, month: 0 });
  });
});
