import type { NewRecordInput } from '../../types/record';
import { RECORDS_STORAGE_KEY, ValidationError, createRecordRepository } from '../recordRepository';
import type { KeyValueStorage } from '../storage';

function createMemoryStorage(initial: Record<string, string> = {}) {
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

const input: NewRecordInput = {
  kind: 'book',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  publisher: null,
  isbn: null,
  coverUrl: null,
  photoUri: null,
  startDate: null,
  endDate: null,
  status: 'planned',
  review: null,
  rating: null,
};

function setup(storage: KeyValueStorage) {
  let n = 0;
  let t = 0;
  return createRecordRepository(storage, {
    generateId: () => `id-${++n}`,
    now: () => `2024-01-01T00:00:0${t++}.000Z`,
  });
}

describe('RecordRepository', () => {
  it('add は id と日時を付与して返し、getAll で読める', async () => {
    const repo = setup(createMemoryStorage().storage);
    const added = await repo.add(input);
    expect(added).toMatchObject({
      ...input,
      id: 'id-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(await repo.getAll()).toEqual([added]);
  });

  it('既定の id・日時生成でも追加できる', async () => {
    const repo = createRecordRepository(createMemoryStorage().storage);
    const a = await repo.add(input);
    const b = await repo.add(input);
    expect(a.id).not.toBe(b.id);
    expect(Number.isNaN(Date.parse(a.createdAt))).toBe(false);
  });

  it('update は updatedAt を更新し createdAt は不変', async () => {
    const repo = setup(createMemoryStorage().storage);
    const added = await repo.add(input);
    const updated = await repo.update(added.id, { ...input, title: '坊っちゃん', rating: 4 });
    expect(updated).toMatchObject({ id: added.id, title: '坊っちゃん', rating: 4 });
    expect(updated?.createdAt).toBe(added.createdAt);
    expect(updated?.updatedAt).toBe('2024-01-01T00:00:01.000Z');
    expect(await repo.getAll()).toEqual([updated]);
  });

  it('update は存在しない id なら null', async () => {
    const repo = setup(createMemoryStorage().storage);
    expect(await repo.update('nope', input)).toBeNull();
  });

  it('delete は存在すれば true、なければ false', async () => {
    const repo = setup(createMemoryStorage().storage);
    const added = await repo.add(input);
    expect(await repo.delete(added.id)).toBe(true);
    expect(await repo.delete(added.id)).toBe(false);
    expect(await repo.getAll()).toEqual([]);
  });

  it.each([
    ['タイトル空', { title: ' ' }],
    ['レーティング不正', { rating: 0.5 }],
    ['日付逆転', { startDate: '2024-02-01', endDate: '2024-01-01' }],
  ])('不正な入力（%s）は保存せず ValidationError', async (_n, patch) => {
    const { storage, data } = createMemoryStorage();
    const repo = setup(storage);
    const added = await repo.add(input);
    const before = data.get(RECORDS_STORAGE_KEY);
    await expect(repo.add({ ...input, ...patch })).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.update(added.id, { ...input, ...patch })).rejects.toBeInstanceOf(ValidationError);
    expect(data.get(RECORDS_STORAGE_KEY)).toBe(before);
  });

  it('別インスタンスから保存済みの記録を読める', async () => {
    const { storage } = createMemoryStorage();
    const added = await setup(storage).add(input);
    expect(await setup(storage).getAll()).toEqual([added]);
  });

  it('同時に add しても更新が失われない', async () => {
    const repo = setup(createMemoryStorage().storage);
    await Promise.all([repo.add(input), repo.add(input), repo.add(input)]);
    expect(await repo.getAll()).toHaveLength(3);
  });

  it('書き込み失敗は呼び出し側に伝わり、以降の書き込みは続けられる', async () => {
    const { storage } = createMemoryStorage();
    let fail = true;
    const flaky: KeyValueStorage = {
      ...storage,
      setItem: async (k, v) => {
        if (fail) throw new Error('disk full');
        await storage.setItem(k, v);
      },
    };
    const repo = setup(flaky);
    await expect(repo.add(input)).rejects.toThrow('disk full');
    fail = false;
    await repo.add(input);
    expect(await repo.getAll()).toHaveLength(1);
  });

  describe('壊れたデータ', () => {
    it.each([
      ['壊れた JSON', '{oops'],
      ['配列でない値', '{"a":1}'],
    ])('%s でも空配列', async (_n, raw) => {
      const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: raw });
      expect(await setup(storage).getAll()).toEqual([]);
    });

    it('不正な要素は読み飛ばし、未知フィールドは除去する', async () => {
      const added = await setup(createMemoryStorage().storage).add(input);
      const raw = JSON.stringify([{ ...added, extra: 1 }, { id: 'bad' }]);
      const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: raw });
      expect(await setup(storage).getAll()).toEqual([added]);
    });

    it('getItem が reject しても空配列', async () => {
      const storage: KeyValueStorage = {
        getItem: () => Promise.reject(new Error('fail')),
        setItem: async () => undefined,
        removeItem: async () => undefined,
      };
      expect(await setup(storage).getAll()).toEqual([]);
    });
  });
});
