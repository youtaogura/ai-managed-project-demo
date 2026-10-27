import { colors } from '../design/tokens';
import type { SpineColor } from '../types/record';
import { SPINE_COLORS } from './constants';

/** 既存の記録が n 件のときの、新しい記録の背表紙の色。 */
export function spineColorForIndex(n: number): SpineColor {
  return SPINE_COLORS[n % SPINE_COLORS.length] ?? SPINE_COLORS[0];
}

const SPINE_FACES: Record<SpineColor, string> = {
  'spine-1': colors.spine1,
  'spine-2': colors.spine2,
  'spine-3': colors.spine3,
  'spine-4': colors.spine4,
  'spine-5': colors.spine5,
  'spine-6': colors.spine6,
  'spine-7': colors.spine7,
  'spine-8': colors.spine8,
  'spine-9': colors.spine9,
  'spine-10': colors.spine10,
};

/** 背表紙の色の名前（`spine-N`）に対応する色の値。 */
export function spineColorToken(color: SpineColor): string {
  return SPINE_FACES[color];
}
