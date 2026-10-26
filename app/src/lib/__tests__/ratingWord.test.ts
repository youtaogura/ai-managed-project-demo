import { getRatingWord } from '../ratingWord';

describe('getRatingWord', () => {
  it.each<[number | null, string | null]>([
    [5.0, '最高'],
    [4.9, 'よかった'],
    [4.1, 'よかった'],
    [4.0, 'よかった'],
    [3.9, 'まあまあ'],
    [3.0, 'まあまあ'],
    [2.9, 'あんまり'],
    [1.0, 'あんまり'],
    [0.5, 'あんまり'],
    [5.2, '最高'],
    [null, null],
  ])('%s → %s', (rating, word) => {
    expect(getRatingWord(rating)).toBe(word);
  });
});
