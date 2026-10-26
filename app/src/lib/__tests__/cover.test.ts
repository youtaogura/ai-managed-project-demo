import { colors } from '../../design/tokens';
import { MEDIA_KINDS } from '../../types/record';
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

  it.each(MEDIA_KINDS)('%s の色はトークンから引く', (kind) => {
    const k = kind.charAt(0).toUpperCase() + kind.slice(1);
    expect(getCoverColors(kind)).toEqual({
      bg: colors[`cover${k}Bg` as keyof typeof colors],
      ink: colors[`cover${k}Ink` as keyof typeof colors],
    });
  });
});
