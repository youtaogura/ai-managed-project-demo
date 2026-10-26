import { colors as tokens, space } from '../design/tokens';
import { colors, formColors, kindColors, overlayColors, spacing, starColors } from '../theme';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('theme（互換層）', () => {
  it('tokens の値を参照する', () => {
    expect(colors).toEqual({
      background: tokens.bg,
      text: tokens.textPrimary,
      textMuted: tokens.textSecondary,
      tint: tokens.accent,
      onTint: tokens.accentInk,
      border: tokens.line,
      surface: tokens.surface2,
      danger: tokens.danger,
    });
    expect(spacing).toEqual({ sm: space[2], md: space[3], lg: space[6] });
    expect(formColors).toEqual({
      danger: tokens.danger,
      border: tokens.lineStrong,
      inputBackground: tokens.surface2,
      disabled: tokens.textTertiary,
    });
    expect(overlayColors).toEqual({ text: tokens.textPrimary, background: tokens.scrim });
  });

  it('種別色と星は有彩色でなく accent / starOff', () => {
    for (const color of Object.values(kindColors)) expect(color).toBe(tokens.accent);
    expect(Object.keys(kindColors).sort()).toEqual(['anime', 'book', 'drama', 'manga', 'movie']);
    expect(starColors).toEqual({ filled: tokens.accent, empty: tokens.starOff });
  });

  it('文字色は地色と十分なコントラストがある', () => {
    for (const fg of [colors.text, colors.textMuted, colors.tint, colors.danger]) {
      for (const bg of [colors.background, colors.surface]) {
        expect(fg).not.toBe(bg);
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(colors.onTint, colors.tint)).toBeGreaterThanOrEqual(4.5);
  });
});
