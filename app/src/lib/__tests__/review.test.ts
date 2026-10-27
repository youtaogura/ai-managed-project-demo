import { makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { summarizeReview } from '../review';

const now = new Date(2026, 9, 15);
const done = (id: string, endDate: string | null, extra: Partial<MediaRecord> = {}) =>
  makeRecord({ id, status: 'completed', endDate, ...extra });
const starter = (starter: string, text: string) => ({ id: `s-${starter}-${text}`, starter, text, createdAt: '' });
const quote = (id: string) => ({ id, text: 'q', page: null, comment: null, createdAt: '' });

describe('summarizeReview', () => {
  it('0 件でも 12 か月の枠と空の値を返す', () => {
    const s = summarizeReview([], now);
    expect(s.period).toBe('2025/11 – 2026/10');
    expect(s.months).toHaveLength(12);
    expect(s).toMatchObject({ read: 0, impressions: 0, quotes: 0, favorites: [], topStarter: null });
    expect(s.ratings.average).toBeNull();
    expect(s.ratings.word).toBeNull();
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

  it('感想は書き出しの続きがある本、引用は合計', () => {
    const s = summarizeReview(
      [
        done('a', '2026-10-01', { oneLiner: 'よかった' }),
        done('b', '2026-10-02', { starters: [starter('x', '  '), starter('y', 'ok')], quotes: [quote('1'), quote('2')] }),
        done('c', '2026-10-03', { oneLiner: '  ', starters: [starter('x', '')], quotes: [quote('3')] }),
        done('d', '2024-10-03', { oneLiner: 'x', quotes: [quote('4')] }),
      ],
      now,
    );
    expect(s.impressions).toBe(2);
    expect(s.quotes).toBe(3);
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
    [[5], 5, '最高', [1, 0, 0, 0]],
    [[4], 4, 'よかった', [0, 1, 0, 0]],
    [[3], 3, 'まあまあ', [0, 0, 1, 0]],
    [[2.9], 2.9, 'あんまり', [0, 0, 0, 1]],
    [[5, 4, 4, 3, 3], 3.8, 'まあまあ', [1, 2, 2, 0]],
  ])('どうだった？ %j', (ratings, avg, word, counts) => {
    const s = summarizeReview(
      [...ratings.map((r, i) => done(`r${i}`, '2026-10-01', { rating: r })), done('n', '2026-10-01')],
      now,
    );
    expect(s.ratings.average).toBe(avg);
    expect(s.ratings.word).toBe(word);
    expect(s.ratings.buckets.map((b) => b.count)).toEqual(counts);
  });

  it('いちばん使った書き出しは今年の本から数え、固定の書き出しも含む', () => {
    const s = summarizeReview(
      [
        done('a', '2026-02-01', { oneLiner: 'x' }),
        done('b', '2026-03-01', { oneLiner: 'y', starters: [starter('もし', 'a')] }),
        done('c', '2026-04-01', { starters: [starter('もし', 'b'), starter('そして', '')] }),
        done('d', '2025-12-01', { starters: [starter('そして', 'a'), starter('そして', 'b'), starter('そして', 'c')] }),
      ],
      now,
    );
    expect(s.topStarter).toEqual({ text: 'ひとことで言うと、', count: 2 });
  });

  it('同数なら先に現れた書き出し', () => {
    const s = summarizeReview(
      [done('a', '2026-02-01', { starters: [starter('もし', 'a'), starter('そして', 'a')] })],
      now,
    );
    expect(s.topStarter).toEqual({ text: 'もし', count: 1 });
  });
});
