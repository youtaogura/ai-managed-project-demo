import { createMemoryStorage } from '../../testUtils';
import { createExportStore, LAST_EXPORTED_AT_KEY } from '../exportStore';
import { formatDate } from '../format';

describe('exportStore', () => {
  it('保存して読み戻せる', async () => {
    const { storage, data } = createMemoryStorage();
    const store = createExportStore(storage);
    expect(await store.loadLastExportedAt()).toBeNull();
    await store.saveLastExportedAt('2026-10-26T01:00:00.000Z');
    expect(data.get(LAST_EXPORTED_AT_KEY)).toBe('2026-10-26T01:00:00.000Z');
    expect(await store.loadLastExportedAt()).toBe('2026-10-26T01:00:00.000Z');
  });

  it('不正な値・storage の例外は null', async () => {
    const bad = createExportStore(createMemoryStorage({ [LAST_EXPORTED_AT_KEY]: 'x' }).storage);
    expect(await bad.loadLastExportedAt()).toBeNull();
    const failing = createExportStore({
      getItem: async () => {
        throw new Error('fail');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    });
    expect(await failing.loadLastExportedAt()).toBeNull();
  });
});

describe('formatDate', () => {
  it('年月日で表示し、不正はそのまま返す', () => {
    expect(formatDate(new Date(2026, 9, 26, 12).toISOString())).toBe('2026年10月26日');
    expect(formatDate('x')).toBe('x');
  });
});
