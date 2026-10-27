import { normalizeAuthor, normalizeAuthors } from '../authorName';

describe('normalizeAuthor', () => {
  it.each([
    ['村上, 春樹, 1949-', '村上春樹'],
    ['夏目, 漱石, 1867-1916', '夏目漱石'],
    ['村上春樹 著', '村上春樹'],
    ['村上春樹／著', '村上春樹'],
    ['村上春樹/著', '村上春樹'],
    ['ハルキ／訳', 'ハルキ'],
    ['A／著 B／訳', 'A、B'],
    ['姓／名', '姓／名'],
    ['劉, 慈欣', '劉慈欣'],
    ['村上 春樹', '村上春樹'],
    ['Liu, Cixin', 'Cixin Liu'],
    ['Stephen King', 'Stephen King'],
    ['', null],
    ['   ', null],
    [', 1949-', null],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeAuthor(raw)).toBe(expected);
  });
});

describe('normalizeAuthors', () => {
  it('同じ名前は 1 つにする', () => {
    expect(normalizeAuthors(['村上, 春樹, 1949-', '村上春樹 著'])).toBe('村上春樹');
  });
  it('複数人を、でつなぐ', () => {
    expect(normalizeAuthors(['A', 'B'])).toBe('A、B');
  });
  it('空なら null', () => {
    expect(normalizeAuthors([])).toBeNull();
  });
});
