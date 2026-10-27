import type { SpineColor } from '../types/record';
import { SPINE_COLORS } from './constants';

/** 検索結果の背表紙の色。タイトルの文字コードの和から決める（同じタイトルならいつも同じ色）。保存はしない。 */
export function spineColorForTitle(title: string): SpineColor {
  let sum = 0;
  for (const char of title) sum += char.codePointAt(0) ?? 0;
  return SPINE_COLORS[sum % SPINE_COLORS.length] ?? SPINE_COLORS[0];
}
