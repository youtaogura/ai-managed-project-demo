import { makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { HERO_CRITERIA, HERO_CRITERION_OPTIONS, HERO_LIMIT, selectHeroRecords } from '../heroCriteria';

const ids = (records: MediaRecord[]) => records.map((r) => r.id);
const day = (n: number) => `2024-02-${String(n).padStart(2, '0')}`;
const many = (make: (i: number) => Partial<MediaRecord>) =>
  Array.from({ length: 12 }, (_, i) => makeRecord({ id: `r${i}`, ...make(i) }));

describe('selectHeroRecords', () => {
  it('recent: 終了日の新しい順、同日は createdAt の新しい順、10 件まで', () => {
    const records = [
      makeRecord({ id: 'a', endDate: '2024-01-01' }),
      makeRecord({ id: 'b', endDate: '2024-03-01', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeRecord({ id: 'c', endDate: '2024-03-01', createdAt: '2024-02-01T00:00:00.000Z' }),
      makeRecord({ id: 'd', endDate: null }),
    ];
    expect(ids(selectHeroRecords(records, 'recent'))).toEqual(['c', 'b', 'a']);
    const big = many((i) => ({ endDate: day(i + 1) }));
    expect(selectHeroRecords(big, 'recent')).toHaveLength(HERO_LIMIT);
  });

  it('inProgress: 開始日の新しい順、開始日なしは後ろ、同順は updatedAt の新しい順', () => {
    const records = [
      makeRecord({ id: 'n1', status: 'in_progress', updatedAt: '2024-05-01T00:00:00.000Z' }),
      makeRecord({ id: 'n2', status: 'in_progress', updatedAt: '2024-06-01T00:00:00.000Z' }),
      makeRecord({ id: 'old', status: 'in_progress', startDate: '2024-01-01' }),
      makeRecord({ id: 'new', status: 'in_progress', startDate: '2024-03-01' }),
      makeRecord({ id: 'same', status: 'in_progress', startDate: '2024-03-01', updatedAt: '2025-01-01T00:00:00.000Z' }),
      makeRecord({ id: 'x', status: 'dropped', startDate: '2024-04-01' }),
      makeRecord({ id: 'y', status: 'completed', startDate: '2024-04-01' }),
    ];
    expect(ids(selectHeroRecords(records, 'inProgress'))).toEqual(['same', 'new', 'old', 'n2', 'n1']);
    const big = many((i) => ({ status: 'in_progress', startDate: day(i + 1) }));
    expect(selectHeroRecords(big, 'inProgress')).toHaveLength(HERO_LIMIT);
  });

  it('highRated: 4.0 以上を高い順、同点は createdAt の新しい順、ステータス不問', () => {
    const records = [
      makeRecord({ id: 'low', rating: 3.5 }),
      makeRecord({ id: 'four', rating: 4, status: 'dropped', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeRecord({ id: 'four2', rating: 4, status: 'planned', createdAt: '2024-02-01T00:00:00.000Z' }),
      makeRecord({ id: 'top', rating: 4.5, status: 'completed' }),
      makeRecord({ id: 'none', rating: null }),
    ];
    expect(ids(selectHeroRecords(records, 'highRated'))).toEqual(['top', 'four2', 'four']);
    const big = many(() => ({ rating: 5 }));
    expect(selectHeroRecords(big, 'highRated')).toHaveLength(HERO_LIMIT);
  });

  it('planned: planned のみ、createdAt の新しい順', () => {
    const records = [
      makeRecord({ id: 'a', status: 'planned', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeRecord({ id: 'b', status: 'planned', createdAt: '2024-02-01T00:00:00.000Z' }),
      makeRecord({ id: 'c', status: 'in_progress' }),
      makeRecord({ id: 'd', status: 'dropped' }),
    ];
    expect(ids(selectHeroRecords(records, 'planned'))).toEqual(['b', 'a']);
    const big = many(() => ({ status: 'planned' }));
    expect(selectHeroRecords(big, 'planned')).toHaveLength(HERO_LIMIT);
  });

  it('none: 常に空。入力配列は書き換えない', () => {
    const records = [makeRecord({ id: 'a', endDate: '2024-01-01' }), makeRecord({ id: 'b', endDate: '2024-02-01' })];
    expect(selectHeroRecords(records, 'none')).toEqual([]);
    selectHeroRecords(records, 'recent');
    selectHeroRecords(records, 'highRated');
    expect(ids(records)).toEqual(['a', 'b']);
  });
});

describe('HERO_CRITERIA', () => {
  it('見出し・補足・選択肢の並び', () => {
    expect(HERO_CRITERION_OPTIONS.map((o) => o.id)).toEqual(['recent', 'inProgress', 'highRated', 'planned', 'none']);
    expect(HERO_CRITERIA.recent.title).toBe('最近読み終えた');
    expect(HERO_CRITERIA.inProgress.title).toBe('今読んでる');
    expect(HERO_CRITERIA.highRated.title).toBe('評価の高い作品');
    expect(HERO_CRITERIA.planned.title).toBe('読みたい');
    expect(HERO_CRITERIA.none.title).toBeNull();
    expect(HERO_CRITERIA.none.description).toBeNull();
  });
});
