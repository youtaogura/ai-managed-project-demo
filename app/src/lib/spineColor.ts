import type { SpineColor } from '../types/record';
import { SPINE_COLORS } from './constants';

/** 既存の記録が n 件のときの、新しい記録の背表紙の色。 */
export function spineColorForIndex(n: number): SpineColor {
  return SPINE_COLORS[n % SPINE_COLORS.length] ?? SPINE_COLORS[0];
}
