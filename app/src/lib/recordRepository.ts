import type { MediaRecord, NewRecordInput } from '../types/record';
import { parseRecords } from './recordGuard';
import type { KeyValueStorage } from './storage';
import { isValidRecordInput } from './validation';

export const RECORDS_STORAGE_KEY = 'records.v1';

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
  getAll(): Promise<MediaRecord[]>;
  add(input: NewRecordInput): Promise<MediaRecord>;
  update(id: string, input: NewRecordInput): Promise<MediaRecord | null>;
  delete(id: string): Promise<boolean>;
};

const defaultNow = () => new Date().toISOString();
const defaultGenerateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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

  const load = async (): Promise<MediaRecord[]> => {
    try {
      const raw = await storage.getItem(RECORDS_STORAGE_KEY);
      if (raw === null) return [];
      return parseRecords(JSON.parse(raw));
    } catch {
      return [];
    }
  };

  const save = (records: MediaRecord[]) =>
    storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));

  // 書き込みは直列化して lost update を防ぐ
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    getAll: () => load(),

    add: async (input) => {
      assertValid(input);
      return await serialize(async () => {
        const timestamp = now();
        const record: MediaRecord = {
          ...input,
          id: generateId(),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const records = await load();
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
  };
}
