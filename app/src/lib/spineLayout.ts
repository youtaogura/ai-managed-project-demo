import { size } from '../design/tokens';

export const SPINE_GAP = 3;
export const SHELF_ROW_GAP = 30;

export type SpineSize = { width: number; height: number };

// FNV-1a。同じ ID はいつも同じ値になる
function hash(text: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  // 最後に混ぜて、末尾だけが違う ID でも値が散らばるようにする
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function pick(h: number, min: number, max: number): number {
  return min + (h % (max - min + 1));
}

/** 本の ID だけから背表紙の大きさを決める。並び順やほかの本には影響されない。 */
export function getSpineSize(id: string): SpineSize {
  return {
    width: pick(hash(id, 1), size.spineWidthMin, size.spineWidthMax),
    height: pick(hash(id, 2), size.spineHeightMin, size.spineHeightMax),
  };
}

/** 背表紙を左から並べ、幅（間隔を含む）が availableWidth を超えない数で次の段へ折り返す。 */
export function layoutShelfRows<T extends { id: string }>(
  items: readonly T[],
  availableWidth: number,
  gap: number = SPINE_GAP,
): T[][] {
  const rows: T[][] = [];
  let current: T[] = [];
  let used = 0;
  for (const item of items) {
    const width = getSpineSize(item.id).width;
    const next = current.length === 0 ? width : used + gap + width;
    if (current.length > 0 && next > availableWidth) {
      rows.push(current);
      current = [item];
      used = width;
    } else {
      current.push(item);
      used = next;
    }
  }
  if (current.length > 0) rows.push(current);
  return rows;
}
