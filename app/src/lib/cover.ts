import { colors, typography } from '../design/tokens';
import type { MediaKind } from '../types/record';

export const COVER_ASPECT_RATIO = 2 / 3;

// 文字の表紙のタイトルサイズを切り替える幅の境界
export const COVER_HERO_MIN_WIDTH = 150;
export const COVER_CARD_MIN_WIDTH = 80;

export type CoverTitleVariant = 'hero' | 'card' | 'thumb';

export function coverHeight(width: number): number {
  return width / COVER_ASPECT_RATIO;
}

export function getCoverColors(kind: MediaKind): { bg: string; ink: string } {
  const table: Record<MediaKind, { bg: string; ink: string }> = {
    book: { bg: colors.coverBookBg, ink: colors.coverBookInk },
    manga: { bg: colors.coverMangaBg, ink: colors.coverMangaInk },
    movie: { bg: colors.coverMovieBg, ink: colors.coverMovieInk },
    drama: { bg: colors.coverDramaBg, ink: colors.coverDramaInk },
    anime: { bg: colors.coverAnimeBg, ink: colors.coverAnimeInk },
  };
  return table[kind];
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
