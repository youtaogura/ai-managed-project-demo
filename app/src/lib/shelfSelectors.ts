import type { MediaRecord } from '../types/record';
import type { Shelf } from '../types/shelf';

/** shelfId が null のときは全記録。 */
export function recordsInShelf(records: readonly MediaRecord[], shelfId: string | null): MediaRecord[] {
  if (shelfId === null) return [...records];
  return records.filter((r) => r.shelfIds.includes(shelfId));
}

/** 存在する本棚の ID だけ数える。 */
export function countShelfRecords(
  records: readonly MediaRecord[],
  shelves: readonly Shelf[],
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(shelves.map((s) => [s.id, 0]));
  for (const record of records) {
    for (const id of new Set(record.shelfIds)) {
      if (id in counts) counts[id] += 1;
    }
  }
  return counts;
}

/** 本棚の並び順で、記録が入っている本棚の名前。存在しない ID は除く。 */
export function shelfNames(record: Pick<MediaRecord, 'shelfIds'>, shelves: readonly Shelf[]): string[] {
  return shelves.filter((s) => record.shelfIds.includes(s.id)).map((s) => s.name);
}

/** 並べ替え用。端を越える移動と、無い ID は何もしない。 */
export function moveShelf(ids: readonly string[], id: string, direction: 'up' | 'down'): string[] {
  const from = ids.indexOf(id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
