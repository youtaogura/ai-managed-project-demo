import { makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { summarizeReview } from '../review';

const now = new Date(2026, 9, 15);
const done = (id: string, endDate: string | null, extra: Partial<MediaRecord> = {}) =>
  makeRecord({ id, status: 'completed', endDate, ...extra });
const memo = (text: string) => ({ id: `p-${text}`, text, createdAt: '' });
const quote = (id: string) => ({ id, text: 'q', page: null, comment: null, createdAt: '' });

describe('summarizeReview', () => {
  it('0 件でも 12 か月の枠と空の値を返す', () => {
    const s = summarizeReview([], now);
    expect(s.period).toBe('2025/11 – 2026/10');
    expect(s.months).toHaveLength(12);
    expect(s).toMatchObject({ read: 0, impressions: 0, favorites: [] });
    expect(s).not.toHaveProperty('quotes');
    expect(s).not.toHaveProperty('topStarter');
    expect(s.ratings).not.toHaveProperty('average');
    expect(s.ratings.buckets.map((b) => b.count)).toEqual([0, 0, 0, 0]);
  });

  it('期間の端を含み、期間外・未読了・endDate 不正は除く', () => {
    const s = summarizeReview(
      [
        done('a', '2025-11-01'),
        done('b', '2026-10-31'),
        done('c', '2025-10-31'),
        done('d', '2026-11-01'),
        done('e', null),
        done('f', '2026/10/01'),
        makeRecord({ id: 'g', status: 'in_progress', endDate: '2026-10-05' }),
      ],
      now,
    );
    expect(s.read).toBe(2);
    expect(s.months[0].books.map((b) => b.id)).toEqual(['a']);
    expect(s.months[11].books.map((b) => b.id)).toEqual(['b']);
  });

  it('感想は期間内に読んだ本のうち読後メモ（空白だけは除く）が 1 件以上ある本の数', () => {
    const s = summarizeReview(
      [
        done('a', '2026-10-01', { oneLiner: 'よかった' }),
        done('b', '2026-10-02', { postReadMemos: [memo('  '), memo('ok')], quotes: [quote('1'), quote('2')] }),
        done('c', '2026-10-03', { oneLiner: '  ', postReadMemos: [memo('')], quotes: [quote('3')] }),
        done('d', '2024-10-03', { oneLiner: 'x', postReadMemos: [memo('期間外')], quotes: [quote('4')] }),
        done('e', '2026-09-03', { postReadMemos: [memo('読んだ')] }),
        makeRecord({ id: 'f', status: 'in_progress', postReadMemos: [memo('途中')] }),
      ],
      now,
    );
    expect(s.impressions).toBe(2);
  });

  it('積み上げは endDate → createdAt → id の古い順で、色を持つ', () => {
    const s = summarizeReview(
      [
        done('z', '2026-10-05', { createdAt: '2026-10-05T00:00:00Z', spineColor: 'spine-3' }),
        done('b', '2026-10-05', { createdAt: '2026-10-06T00:00:00Z' }),
        done('a', '2026-10-05', { createdAt: '2026-10-06T00:00:00Z' }),
        done('first', '2026-10-01'),
      ],
      now,
    );
    expect(s.months[11].books.map((b) => b.id)).toEqual(['first', 'z', 'a', 'b']);
    expect(s.months[11].books[1].spineColor).toBe('spine-3');
  });

  it('お気に入りは今年 endDate のものを新しい順（同日は createdAt 新しい順）', () => {
    const fav = (id: string, endDate: string | null, createdAt = '2024-01-01', status: MediaRecord['status'] = 'completed') =>
      makeRecord({ id, favorite: true, endDate, createdAt, status });
    const s = summarizeReview(
      [
        fav('old', '2026-01-01'),
        fav('new', '2026-09-01'),
        fav('same-early', '2026-05-01', '2024-01-01'),
        fav('same-late', '2026-05-01', '2025-01-01'),
        fav('last-year', '2025-12-31'),
        fav('none', null),
        fav('planned', '2026-03-01', '2024-01-01', 'planned'),
        done('plain', '2026-09-09'),
      ],
      now,
    );
    expect(s.favorites.map((r) => r.id)).toEqual(['new', 'same-late', 'same-early', 'planned', 'old']);
  });

  it.each([
    [[5], [1, 0, 0, 0]],
    [[4], [0, 1, 0, 0]],
    [[3], [0, 0, 1, 0]],
    [[2.9], [0, 0, 0, 1]],
    [[5, 4, 4, 3, 3], [1, 2, 2, 0]],
  ])('評価の区分 %j', (ratings, counts) => {
    const s = summarizeReview(
      [...ratings.map((r, i) => done(`r${i}`, '2026-10-01', { rating: r })), done('n', '2026-10-01')],
      now,
    );
    expect(s.ratings.buckets.map((b) => b.count)).toEqual(counts);
  });
});
