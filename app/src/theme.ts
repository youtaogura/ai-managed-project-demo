import type { MediaKind } from './types/record';

export const colors = {
  background: '#fff',
  text: '#111',
  textMuted: '#555',
  tint: '#2f6fed',
  border: '#ddd',
  surface: '#f3f4f6',
  danger: '#d92d20',
} as const;

export const spacing = {
  sm: 8,
  md: 12,
  lg: 24,
} as const;

export const formColors = {
  danger: '#d1242f',
  border: '#c7c7cc',
  inputBackground: '#f6f6f8',
  disabled: '#a9a9b0',
} as const;

export const overlayColors = {
  text: '#fff',
  background: 'rgba(0, 0, 0, 0.5)',
} as const;

export const kindColors: Record<MediaKind, string> = {
  book: '#2f6fed',
  manga: '#e8590c',
  movie: '#9c36b5',
  drama: '#0ca678',
  anime: '#d6336c',
};

export const starColors = {
  filled: '#f5a623',
  empty: '#d9d9de',
} as const;

export const STAR_SIZE = 36;
