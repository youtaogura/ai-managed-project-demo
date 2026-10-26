import { colors } from '../design/tokens';
import { getCoverColors } from './cover';

// 表紙色の割合。残りを bg（黒）に寄せて暗くする
const COVER_COLOR_WEIGHT = 0.45;

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function getHeroBackground(): string {
  const base = parseHex(getCoverColors().bg);
  const bg = parseHex(colors.bg);
  const mixed = base.map((c, i) =>
    Math.round(c * COVER_COLOR_WEIGHT + (bg[i] ?? 0) * (1 - COVER_COLOR_WEIGHT)),
  );
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
