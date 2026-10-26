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
    kind: 'book',
    title: 'タイトル',
    creator: null,
    publisher: null,
    isbn: null,
    coverUrl: null,
    photoUri: null,
    startDate: null,
    endDate: null,
    status: 'planned',
    review: null,
    rating: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createFakeRepository(initial: MediaRecord[] = []) {
  let records = [...initial];
  const repository: RecordRepository = {
    getAll: async () => [...records],
    add: async () => {
      throw new Error('unused');
    },
    update: async () => {
      throw new Error('unused');
    },
    delete: async (id) => {
      const before = records.length;
      records = records.filter((r) => r.id !== id);
      return records.length !== before;
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
