import { buildStatusLine } from '../bookHero';

const r = (status: 'planned' | 'in_progress' | 'completed' | 'dropped', startDate: string | null, endDate: string | null) => ({
  status,
  startDate,
  endDate,
});

describe('buildStatusLine', () => {
  it('読んでる: 始めた日があれば「から」', () => {
    expect(buildStatusLine(r('in_progress', '2026-10-18', null))).toBe('読んでる · 10/18 から');
    expect(buildStatusLine(r('in_progress', null, null))).toBe('読んでる');
  });

  it('読んだ: 期間、同じ日なら1日、終えた日だけ、日付なし', () => {
    expect(buildStatusLine(r('completed', '2026-10-01', '2026-10-20'))).toBe('読んだ · 10/1 – 10/20');
    expect(buildStatusLine(r('completed', '2026-10-20', '2026-10-20'))).toBe('読んだ · 10/20');
    expect(buildStatusLine(r('completed', null, '2026-10-20'))).toBe('読んだ · 10/20');
    expect(buildStatusLine(r('completed', '2026-10-01', null))).toBe('読んだ');
  });

  it('途中でやめた・読みたい', () => {
    expect(buildStatusLine(r('dropped', '2026-10-01', '2026-10-05'))).toBe('途中でやめた · 10/5 まで');
    expect(buildStatusLine(r('dropped', null, null))).toBe('途中でやめた');
    expect(buildStatusLine(r('planned', null, null))).toBe('読みたい');
  });
});
