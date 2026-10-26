import { colors as tokens, space } from './design/tokens';

// 互換層。値は design/tokens.ts からのみ参照する
export const colors = {
  background: tokens.bg,
  text: tokens.textPrimary,
  textMuted: tokens.textSecondary,
  tint: tokens.accent,
  // tint を背景に使うときの文字色
  onTint: tokens.accentInk,
  border: tokens.line,
  surface: tokens.surface2,
  danger: tokens.danger,
} as const;

export const spacing = {
  sm: space[2],
  md: space[3],
  lg: space[6],
} as const;

export const formColors = {
  danger: tokens.danger,
  border: tokens.lineStrong,
  inputBackground: tokens.surface2,
  disabled: tokens.textTertiary,
} as const;

export const overlayColors = {
  text: tokens.textPrimary,
  background: tokens.scrim,
} as const;

export const starColors = {
  filled: tokens.accent,
  empty: tokens.starOff,
} as const;

export const STAR_SIZE = 36;
