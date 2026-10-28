import { HINT_CATEGORY_LABELS, HINTS, LOW_RATING_MAX, pickHints, pickOtherHints, type HintCategory } from '../hints';

const categoryOf = (hint: string): HintCategory | undefined =>
  (Object.keys(HINTS) as HintCategory[]).find((category) => HINTS[category].includes(hint));

/** 決まった列を順に返す乱数 */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

const MIDDLE: HintCategory[] = ['content', 'self', 'connection'];

describe('ヒントの一覧', () => {
  // Hint/README.md の表どおり（Issue 本文は「22 個」だが、表は 21 個。正本の表に合わせる）
  it('6 種類・21 個で、すべて違う文', () => {
    expect(Object.values(HINT_CATEGORY_LABELS)).toEqual(['感じたこと', '中身', '自分ごと', 'つながり', '人に勧める', '合わなかったとき']);
    const all = Object.values(HINTS).flat();
    expect(all).toHaveLength(21);
    expect(new Set(all).size).toBe(21);
    expect(HINTS.feeling).toHaveLength(5);
    expect(HINTS.content).toHaveLength(4);
    expect(HINTS.self).toHaveLength(4);
    expect(HINTS.connection).toHaveLength(2);
    expect(HINTS.recommend).toHaveLength(3);
    expect(HINTS.mismatch).toHaveLength(3);
    expect(HINTS.feeling[0]).toBe('いちばん心に残ったのは、');
    expect(HINTS.self[3]).toBe('昔の自分に読ませたいのは、なぜなら');
    expect(HINTS.mismatch[2]).toBe('それでも残ったのは、');
  });
});

describe('pickHints', () => {
  it.each([[null], [3], [4.5], [5]])('どうだった？が %p なら、感じたこと・中身/自分ごと/つながり・人に勧める から 1 つずつ', (rating) => {
    for (let n = 0; n < 30; n++) {
      const hints = pickHints(rating);
      expect(hints).toHaveLength(3);
      expect(categoryOf(hints[0] ?? '')).toBe('feeling');
      expect(MIDDLE).toContain(categoryOf(hints[1] ?? ''));
      expect(categoryOf(hints[2] ?? '')).toBe('recommend');
    }
  });

  it.each([[LOW_RATING_MAX], [2], [1]])('%p 以下（あんまり）なら真ん中は合わなかったとき', (rating) => {
    const hints = pickHints(rating);
    expect(categoryOf(hints[0] ?? '')).toBe('feeling');
    expect(categoryOf(hints[1] ?? '')).toBe('mismatch');
    expect(categoryOf(hints[2] ?? '')).toBe('recommend');
  });

  it('真ん中は中身・自分ごと・つながりを合わせた中から選ぶ', () => {
    // 合わせた 10 個の、最初・つながりの最後
    expect(pickHints(4, sequence(0, 0, 0))[1]).toBe(HINTS.content[0]);
    expect(pickHints(4, sequence(0, 0.99, 0))[1]).toBe(HINTS.connection[1]);
    expect(pickHints(4, sequence(0, 0.45, 0))[1]).toBe(HINTS.self[0]);
  });

  it('乱数が 1 を返しても一覧の外を選ばない', () => {
    expect(pickHints(4, () => 1)).toEqual([HINTS.feeling[4], HINTS.connection[1], HINTS.recommend[2]]);
  });
});

describe('pickOtherHints', () => {
  it('同じ決まりで、今出ているものと重ならないものを選ぶ', () => {
    for (let n = 0; n < 30; n++) {
      const current = pickHints(4);
      const next = pickOtherHints(current, 4);
      expect(next).toHaveLength(3);
      expect(next.some((hint) => current.includes(hint))).toBe(false);
      expect(categoryOf(next[0] ?? '')).toBe('feeling');
      expect(MIDDLE).toContain(categoryOf(next[1] ?? ''));
      expect(categoryOf(next[2] ?? '')).toBe('recommend');
    }
  });

  it('あんまりの本でも合わなかったときから、今と別のものを選ぶ', () => {
    const current = pickHints(2, () => 0);
    const next = pickOtherHints(current, 2, () => 0);
    expect(next).toEqual([HINTS.feeling[1], HINTS.mismatch[1], HINTS.recommend[1]]);
  });

  it('枠の中に今出ていないものがなければ、その枠は全体から選ぶ', () => {
    const next = pickOtherHints([...HINTS.recommend, HINTS.feeling[0] ?? ''], 4, () => 0);
    expect(next[0]).toBe(HINTS.feeling[1]);
    expect(next[2]).toBe(HINTS.recommend[0]);
  });
});
