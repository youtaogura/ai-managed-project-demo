import type { PhotoService } from './lib/photo/PhotoService';
import type { MediaRecord } from './types/record';
import type { RecordRepository } from './lib/recordRepository';
import type { KeyValueStorage } from './lib/storage';

export function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return { storage, data };
}

export function makeRecord(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: 'r1',
    title: 'タイトル',
    creator: null,
    publisher: null,
    isbn: null,
    coverUrl: null,
    photoUri: null,
    startDate: null,
    endDate: null,
    status: 'planned',
    rating: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    source: { provider: 'manual' },
    oneLiner: null,
    starters: [],
    quotes: [],
    memos: [],
    freeTexts: [],
    favorite: false,
    spineColor: 'spine-1',
    shelfIds: [],
    ...overrides,
  };
}

export function createFakeRepository(initial: MediaRecord[] = []) {
  let records = [...initial];
  const repository: RecordRepository = {
    migrate: async () => undefined,
    getAll: async () => [...records],
    add: async () => {
      throw new Error('unused');
    },
    update: async (id, input) => {
      const current = records.find((r) => r.id === id);
      if (!current) return null;
      const next = {
        ...current,
        ...input,
        updatedAt: '2024-06-01T00:00:00.000Z',
      };
      records = records.map((r) => (r.id === id ? next : r));
      return next;
    },
    delete: async (id) => {
      const before = records.length;
      records = records.filter((r) => r.id !== id);
      return records.length !== before;
    },
    deleteAll: async () => {
      const deleted = records;
      records = [];
      return deleted;
    },
    removeShelfId: async (shelfId) => {
      records = records.map((r) => ({
        ...r,
        shelfIds: r.shelfIds.filter((s) => s !== shelfId),
      }));
    },
    importRecords: async (incoming, mode) => {
      records = mode === 'replace' ? [...incoming] : [...records, ...incoming];
      return records.length;
    },
  };
  return { repository, setRecords: (next: MediaRecord[]) => (records = next) };
}

export function createMockPhotoService(overrides: Partial<PhotoService> = {}): PhotoService {
  return {
    pick: jest.fn().mockResolvedValue({ status: 'canceled' }),
    save: jest.fn(async (uri: string) => `file:///documents/photos/saved-${uri.split('/').pop()}`),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
