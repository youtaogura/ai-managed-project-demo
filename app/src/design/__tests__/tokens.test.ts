import { colors, radius, size, space, typography } from '../tokens';

describe('デザイントークン', () => {
  it('色はすべて CSS の色の値になっている', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^(#[0-9a-f]{3,8}|rgba?\(.+\))$/);
    }
  });

  it('アクセントは白（本文の文字色）で、アクセント上の文字は背景色', () => {
    expect(colors.accent).toBe(colors.textPrimary);
    expect(colors.accentInk).toBe(colors.bg);
  });

  it('文字スタイルは数値の大きさと行の高さを持つ', () => {
    for (const style of Object.values(typography)) {
      expect(typeof style.fontSize).toBe('number');
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });

  it('タップできるものの最小サイズは 44 以上', () => {
    expect(size.touchMin).toBeGreaterThanOrEqual(44);
    expect(size.buttonHeight).toBeGreaterThanOrEqual(size.touchMin);
  });

  it('余白は小さい順に並ぶ', () => {
    const steps = Object.values(space);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    expect(radius.thumb).toBeLessThan(radius.card);
  });
});
