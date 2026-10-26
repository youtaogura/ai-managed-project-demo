import { colors, typography } from '../design/tokens';

export const COVER_ASPECT_RATIO = 2 / 3;

// 文字の表紙のタイトルサイズを切り替える幅の境界
export const COVER_HERO_MIN_WIDTH = 150;
export const COVER_CARD_MIN_WIDTH = 80;

export type CoverTitleVariant = 'hero' | 'card' | 'thumb';

export function coverHeight(width: number): number {
  return width / COVER_ASPECT_RATIO;
}

export function getCoverColors(): { bg: string; ink: string } {
  return { bg: colors.coverBookBg, ink: colors.coverBookInk };
}

export function getCoverTitleVariant(width: number): CoverTitleVariant {
  if (width >= COVER_HERO_MIN_WIDTH) return 'hero';
  if (width >= COVER_CARD_MIN_WIDTH) return 'card';
  return 'thumb';
}

export const COVER_TITLE_STYLES = {
  hero: typography.coverTitleHero,
  card: typography.coverTitleCard,
  thumb: typography.coverTitleThumb,
} as const;

export const COVER_TITLE_LINES: Record<CoverTitleVariant, number> = {
  hero: 6,
  card: 5,
  thumb: 4,
};
