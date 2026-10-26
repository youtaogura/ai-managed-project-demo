import { colors } from '../../design/tokens';
import { MEDIA_KINDS } from '../../types/record';
import { getCoverColors } from '../cover';
import { getHeroBackground } from '../heroColor';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('getHeroBackground', () => {
  it('種別色を bg 側へ寄せた、元より暗い色を返す', () => {
    for (const kind of MEDIA_KINDS) {
      const hero = getHeroBackground(kind);
      expect(hero).toMatch(/^#[0-9a-f]{6}$/);
      const [h, c, b] = [hero, getCoverColors(kind).bg, colors.bg].map(channels);
      h?.forEach((v, i) => {
        expect(v).toBeLessThanOrEqual(c?.[i] ?? 0);
        expect(v).toBeGreaterThanOrEqual(b?.[i] ?? 0);
      });
    }
  });

  it('book は 45% 混合の値になる', () => {
    expect(getHeroBackground('book')).toBe('#181e2a');
  });
});
