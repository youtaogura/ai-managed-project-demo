import type { ImportMode } from '../types/backup';
import type { MediaRecord, NewRecordInput } from '../types/record';
import { spineColorForIndex } from './spineColor';
import { parseRecords } from './recordGuard';
import { RECORDS_KEY, migrateRecords } from './recordMigration';
import type { KeyValueStorage } from './storage';
import { isValidRecordInput } from './validation';

export const RECORDS_STORAGE_KEY = RECORDS_KEY;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type RecordRepositoryOptions = {
  now?: () => string;
  generateId?: () => string;
};

export type RecordRepository = {
  migrate(): Promise<void>;
  getAll(): Promise<MediaRecord[]>;
  add(input: NewRecordInput): Promise<MediaRecord>;
  update(id: string, input: NewRecordInput): Promise<MediaRecord | null>;
  delete(id: string): Promise<boolean>;
  /** すべての記録を削除し、削除した記録を返す。保存は 1 回の setItem で、失敗したら reject し記録は変わらない。 */
  deleteAll(): Promise<MediaRecord[]>;
  /** すべての記録の shelfIds から本棚を外す。保存は 1 回の setItem。 */
  removeShelfId(shelfId: string): Promise<void>;
  /** 読み込み後の件数を返す。保存は 1 回の setItem で、失敗したら reject し記録は変わらない。 */
  importRecords(records: readonly MediaRecord[], mode: ImportMode): Promise<number>;
};

const defaultNow = () => new Date().toISOString();
const defaultGenerateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function assertValid(input: NewRecordInput): void {
  if (!isValidRecordInput(input)) {
    throw new ValidationError('記録の内容が正しくありません');
  }
}

export function createRecordRepository(
  storage: KeyValueStorage,
  options: RecordRepositoryOptions = {},
): RecordRepository {
  const now = options.now ?? defaultNow;
  const generateId = options.generateId ?? defaultGenerateId;
  let queue: Promise<unknown> = Promise.resolve();
  let migration: Promise<void> | null = null;

  // 移行は 1 回だけ。結果は memoize し、各操作は完了を待つ（失敗しても操作は通常どおり動く）
  const migrate = (): Promise<void> => {
    migration ??= migrateRecords(storage).then(
      () => undefined,
      () => undefined,
    );
    return migration;
  };

  const load = async (): Promise<MediaRecord[]> => {
    await migrate();
    try {
      const raw = await storage.getItem(RECORDS_STORAGE_KEY);
      if (raw === null) return [];
      return parseRecords(JSON.parse(raw));
    } catch {
      return [];
    }
  };

  const save = (records: MediaRecord[]) => storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));

  // 書き込みは直列化して lost update を防ぐ
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    migrate,

    getAll: () => load(),

    add: async (input) => {
      assertValid(input);
      return await serialize(async () => {
        const timestamp = now();
        const records = await load();
        const record: MediaRecord = {
          ...input,
          id: generateId(),
          createdAt: timestamp,
          updatedAt: timestamp,
          spineColor: spineColorForIndex(records.length),
        };
        await save([...records, record]);
        return record;
      });
    },

    update: async (id, input) => {
      assertValid(input);
      return await serialize(async () => {
        const records = await load();
        const index = records.findIndex((r) => r.id === id);
        const current = records[index];
        if (!current) return null;
        const updated: MediaRecord = {
          ...input,
          id: current.id,
          createdAt: current.createdAt,
          updatedAt: now(),
          spineColor: current.spineColor,
        };
        const next = [...records];
        next[index] = updated;
        await save(next);
        return updated;
      });
    },

    delete: (id) =>
      serialize(async () => {
        const records = await load();
        const next = records.filter((r) => r.id !== id);
        if (next.length === records.length) return false;
        await save(next);
        return true;
      }),

    deleteAll: () =>
      serialize(async () => {
        const records = await load();
        await save([]);
        return records;
      }),

    removeShelfId: (shelfId) =>
      serialize(async () => {
        const records = await load();
        await save(
          records.map((r) =>
            r.shelfIds.includes(shelfId) ? { ...r, shelfIds: r.shelfIds.filter((s) => s !== shelfId) } : r,
          ),
        );
      }),

    importRecords: (incoming, mode) =>
      serialize(async () => {
        const next = mode === 'replace' ? [...incoming] : mergeRecords(await load(), incoming);
        await save(next);
        return next.length;
      }),
  };
}

// 今の記録を残し、同じ id はファイルの内容にする。ファイル側に写真がなければ今の写真を残す
function mergeRecords(current: MediaRecord[], incoming: readonly MediaRecord[]): MediaRecord[] {
  const incomingById = new Map(incoming.map((r) => [r.id, r]));
  const currentIds = new Set(current.map((r) => r.id));
  const merged = current.map((r) => {
    const replacement = incomingById.get(r.id);
    return replacement ? { ...replacement, photoUri: replacement.photoUri ?? r.photoUri } : r;
  });
  return [...merged, ...incoming.filter((r) => !currentIds.has(r.id))];
}
