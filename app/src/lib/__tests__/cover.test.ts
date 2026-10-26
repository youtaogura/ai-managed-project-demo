import { colors } from '../../design/tokens';
import { coverHeight, getCoverColors, getCoverTitleVariant } from '../cover';

describe('cover', () => {
  it.each([
    [56, 84],
    [150, 225],
    [196, 294],
  ])('幅 %i の高さは %i', (w, h) => {
    expect(coverHeight(w)).toBe(h);
  });

  it.each([
    [79, 'thumb'],
    [80, 'card'],
    [149, 'card'],
    [150, 'hero'],
  ] as const)('幅 %i のタイトルは %s', (w, v) => {
    expect(getCoverTitleVariant(w)).toBe(v);
  });

  it('色は本の表紙色のトークンから引く', () => {
    expect(getCoverColors()).toEqual({ bg: colors.coverBookBg, ink: colors.coverBookInk });
  });
});
