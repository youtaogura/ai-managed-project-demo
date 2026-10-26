import type { Shelf } from '../types/shelf';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isShelf(value: unknown): value is Shelf {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.name === 'string' &&
    value.name.trim() !== '' &&
    typeof value.order === 'number' &&
    Number.isFinite(value.order)
  );
}

/** order 順に並べ、order を 0 始まりの連番にそろえる。 */
export function normalizeShelves(shelves: readonly Shelf[]): Shelf[] {
  return [...shelves]
    .sort((a, b) => a.order - b.order)
    .map((shelf, order) => ({ id: shelf.id, name: shelf.name, order }));
}

/** 読めない要素と ID の重複は捨てる。 */
export function parseShelves(raw: unknown): Shelf[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const shelves: Shelf[] = [];
  for (const item of raw) {
    if (!isShelf(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    shelves.push(item);
  }
  return normalizeShelves(shelves);
}
