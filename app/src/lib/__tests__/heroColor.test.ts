import { colors } from '../../design/tokens';
import { MEDIA_KINDS } from '../../types/record';
import { getCoverColors } from '../cover';
import { getHeroBackground } from '../heroColor';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('getHeroBackground', () => {
  it('種別色を bg 側へ寄せた色（種別色と bg の間の色）を返す', () => {
    for (const kind of MEDIA_KINDS) {
      const hero = getHeroBackground(kind);
      expect(hero).toMatch(/^#[0-9a-f]{6}$/);
      const [h, c, b] = [hero, getCoverColors(kind).bg, colors.bg].map(channels);
      h?.forEach((v, i) => {
        const lo = Math.min(c?.[i] ?? 0, b?.[i] ?? 0);
        const hi = Math.max(c?.[i] ?? 0, b?.[i] ?? 0);
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
      });
    }
  });

  it('book は種別色 45%・bg 55% の混合になる', () => {
    const [c, b] = [getCoverColors('book').bg, colors.bg].map(channels);
    const expected = `#${[0, 1, 2]
      .map((i) => Math.round((c?.[i] ?? 0) * 0.45 + (b?.[i] ?? 0) * 0.55).toString(16).padStart(2, '0'))
      .join('')}`;
    expect(getHeroBackground('book')).toBe(expected);
  });
});
