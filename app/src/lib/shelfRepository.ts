import type { ImportMode } from '../types/backup';
import type { Shelf } from '../types/shelf';
import { normalizeShelves, parseShelves } from './shelfGuard';
import type { KeyValueStorage } from './storage';
import { ValidationError } from './recordRepository';

export const SHELVES_STORAGE_KEY = 'shelves.v1';

export type ShelfRepositoryOptions = {
  generateId?: () => string;
};

export type ShelfRepository = {
  getAll(): Promise<Shelf[]>;
  create(name: string): Promise<Shelf>;
  /** 存在しない ID は null */
  rename(id: string, name: string): Promise<Shelf | null>;
  /** ID の並びで order を振り直す。一覧に無い ID は無視し、渡されなかった本棚は末尾に元の順で残す。 */
  reorder(ids: readonly string[]): Promise<Shelf[]>;
  delete(id: string): Promise<boolean>;
  /** replace は置き換え。merge は同じ ID をファイルの内容にし、ほかは両方残す。 */
  importShelves(shelves: readonly Shelf[], mode: ImportMode): Promise<Shelf[]>;
};

const defaultGenerateId = () => `shelf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function validName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') throw new ValidationError('本棚の名前を入力してください');
  return trimmed;
}

export function createShelfRepository(storage: KeyValueStorage, options: ShelfRepositoryOptions = {}): ShelfRepository {
  const generateId = options.generateId ?? defaultGenerateId;
  let queue: Promise<unknown> = Promise.resolve();

  const load = async (): Promise<Shelf[]> => {
    try {
      const raw = await storage.getItem(SHELVES_STORAGE_KEY);
      if (raw === null) return [];
      return parseShelves(JSON.parse(raw));
    } catch {
      return [];
    }
  };

  const save = async (shelves: Shelf[]): Promise<Shelf[]> => {
    const normalized = shelves.map((shelf, order) => ({ ...shelf, order }));
    await storage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  };

  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    getAll: () => load(),

    create: async (name) => {
      const trimmed = validName(name);
      return await serialize(async () => {
        const shelves = await load();
        const shelf: Shelf = {
          id: generateId(),
          name: trimmed,
          order: shelves.length,
        };
        await save([...shelves, shelf]);
        return shelf;
      });
    },

    rename: async (id, name) => {
      const trimmed = validName(name);
      return await serialize(async () => {
        const shelves = await load();
        const current = shelves.find((s) => s.id === id);
        if (!current) return null;
        const renamed = { ...current, name: trimmed };
        await save(shelves.map((s) => (s.id === id ? renamed : s)));
        return renamed;
      });
    },

    reorder: (ids) =>
      serialize(async () => {
        const shelves = await load();
        const byId = new Map(shelves.map((s) => [s.id, s]));
        const ordered: Shelf[] = [];
        for (const id of ids) {
          const shelf = byId.get(id);
          if (!shelf) continue;
          ordered.push(shelf);
          byId.delete(id);
        }
        return await save([...ordered, ...byId.values()]);
      }),

    delete: (id) =>
      serialize(async () => {
        const shelves = await load();
        const next = shelves.filter((s) => s.id !== id);
        if (next.length === shelves.length) return false;
        await save(next);
        return true;
      }),

    importShelves: (incoming, mode) =>
      serialize(async () => {
        if (mode === 'replace') return await save(normalizeShelves(incoming));
        const current = await load();
        const sorted = normalizeShelves(incoming);
        const incomingById = new Map(sorted.map((s) => [s.id, s]));
        const currentIds = new Set(current.map((s) => s.id));
        const merged = current.map((s) => incomingById.get(s.id) ?? s);
        return await save([...merged, ...sorted.filter((s) => !currentIds.has(s.id))]);
      }),
  };
}
