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
    ['Graham, Paul, 1964-', 'Paul Graham'],
    ['Graham, Paul, 1964- 川合, 史朗', 'Paul Graham、川合史朗'],
    ['Graham, Paul／著 川合, 史朗／訳', 'Paul Graham、川合史朗'],
    ['Graham, Paul, 1964- 川合, 史朗, 1960-2020', 'Paul Graham、川合史朗'],
    ['ポール・グレアム／著 川合史朗／訳', 'ポール・グレアム、川合史朗'],
    ['A, B, 1900- C, D, 1950- E, F, 1980-', 'B A、D C、F E'],
    ['A／著 B／訳 C／監修 A／著', 'A、B、C'],
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
  it('配列で渡された 2 人', () => {
    expect(normalizeAuthors(['Graham, Paul, 1964-', '川合, 史朗'])).toBe('Paul Graham、川合史朗');
  });
  it('配列の 3 人以上', () => {
    expect(normalizeAuthors(['Graham, Paul, 1964-', '川合, 史朗', 'Liu, Cixin'])).toBe(
      'Paul Graham、川合史朗、Cixin Liu',
    );
  });
  it('空なら null', () => {
    expect(normalizeAuthors([])).toBeNull();
  });
});
