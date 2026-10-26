import { colors } from '../design/tokens';
import type { MediaKind } from '../types/record';

// 種別ごとの灰色。トークンに専用の段がない間の代替（本がいちばん明るく、アニメがいちばん暗い）
export const KIND_SHADES: Record<MediaKind, string> = {
  book: colors.textPrimary,
  manga: colors.textSecondary,
  movie: colors.textTertiary,
  drama: colors.lineStrong,
  anime: colors.surface2,
};
