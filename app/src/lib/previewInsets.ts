import type { EdgeInsets } from 'react-native-safe-area-context';

/** `上,右,下,左`（px）を余白に変換する。未設定・不正値は null */
export function parsePreviewInsets(value: string | undefined): EdgeInsets | null {
  if (!value) return null;
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => part === '')) return null;
  const numbers = parts.map(Number);
  if (!numbers.every((n) => Number.isFinite(n) && n >= 0)) return null;
  const [top = 0, right = 0, bottom = 0, left = 0] = numbers;
  return { top, right, bottom, left };
}
