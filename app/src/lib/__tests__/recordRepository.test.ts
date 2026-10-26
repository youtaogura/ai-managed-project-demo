import { makeRecord } from '../../testUtils';
import type { NewRecordInput } from '../../types/record';
import { RECORDS_STORAGE_KEY, ValidationError, createRecordRepository } from '../recordRepository';
import { defaultStarterSettings } from '../starterDefaults';
import { createStarterSettingsStore } from '../starterSettingsStore';
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
  title: '吾輩は猫である',
  creator: '夏目漱石',
  publisher: null,
  isbn: null,
  coverUrl: null,
  photoUri: null,
  startDate: null,
  endDate: null,
  status: 'planned',
  rating: null,
  source: { provider: 'manual' },
  oneLiner: null,
  starters: [],
  quotes: [],
  memos: [],
  freeTexts: [],
  favorite: false,
  shelfIds: [],
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
    const updated = await repo.update(added.id, {
      ...input,
      title: '坊っちゃん',
      rating: 4,
    });
    expect(updated).toMatchObject({
      id: added.id,
      title: '坊っちゃん',
      rating: 4,
    });
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

  describe('移行', () => {
    const { source: _s, ...legacyInput } = input;
    const raw = JSON.stringify([
      {
        ...legacyInput,
        id: 'old',
        spineColor: 'spine-1',
        createdAt: 'a',
        updatedAt: 'b',
        isbn: '9784065199817',
      },
    ]);

    it('migrate は 1 回だけ走り、旧形式の記録に source が書き戻される', async () => {
      const { storage, data } = createMemoryStorage({ 'records.v1': raw });
      const getItem = jest.spyOn(storage, 'getItem');
      const repo = setup(storage);
      await Promise.all([repo.migrate(), repo.migrate()]);
      expect(getItem.mock.calls.filter(([k]) => k === 'records.schemaVersion')).toHaveLength(1);
      expect(JSON.parse(data.get('records.v1') ?? '')[0].source).toEqual({
        provider: 'openbd',
        isbn: '9784065199817',
      });
    });

    it('getAll は移行の完了を待ち、source を補って返す', async () => {
      const { storage } = createMemoryStorage({ 'records.v1': raw });
      const repo = setup(storage);
      const [record] = await repo.getAll();
      expect(record?.source).toEqual({
        provider: 'openbd',
        isbn: '9784065199817',
      });
    });

    it('移行が失敗しても操作は通常どおり動き、旧形式も読み込みで補われる', async () => {
      const { storage } = createMemoryStorage({ 'records.v1': raw });
      const failing: KeyValueStorage = {
        ...storage,
        setItem: jest.fn().mockRejectedValue(new Error('x')),
      };
      const repo = setup(failing);
      await expect(repo.migrate()).resolves.toBeUndefined();
      expect((await repo.getAll())[0]?.source.provider).toBe('openbd');
    });

    it('add に渡した source が保存される', async () => {
      const repo = setup(createMemoryStorage().storage);
      const added = await repo.add({
        ...input,
        source: { provider: 'ndl', ndlId: '1' },
      });
      expect((await repo.getAll())[0]).toEqual(added);
      expect(added.source).toEqual({ provider: 'ndl', ndlId: '1' });
    });
  });
});

describe('RecordRepository.importRecords', () => {
  const seed = (records: ReturnType<typeof makeRecord>[]) =>
    createMemoryStorage({ [RECORDS_STORAGE_KEY]: JSON.stringify(records) });

  it('merge: 今の記録を残し、同じ id はファイルの内容（日時も）になる', async () => {
    const { storage } = seed([makeRecord({ id: 'a', title: '古い' }), makeRecord({ id: 'b', title: '残る' })]);
    const repo = setup(storage);
    const count = await repo.importRecords(
      [
        makeRecord({
          id: 'a',
          title: '新しい',
          updatedAt: '2025-05-05T00:00:00.000Z',
        }),
        makeRecord({ id: 'c', title: '追加' }),
      ],
      'merge',
    );
    expect(count).toBe(3);
    const all = await repo.getAll();
    expect(all.map((r) => r.title)).toEqual(['新しい', '残る', '追加']);
    expect(all[0]?.updatedAt).toBe('2025-05-05T00:00:00.000Z');
  });

  it('merge: ファイル側の photoUri が null なら今の写真を残す', async () => {
    const { storage } = seed([makeRecord({ id: 'a', photoUri: 'file:///p.jpg' })]);
    const repo = setup(storage);
    await repo.importRecords([makeRecord({ id: 'a', photoUri: null, title: '新' })], 'merge');
    const [rec] = await repo.getAll();
    expect(rec).toMatchObject({ title: '新', photoUri: 'file:///p.jpg' });
  });

  it('replace: ファイルの記録だけになる', async () => {
    const { storage } = seed([makeRecord({ id: 'a' })]);
    const repo = setup(storage);
    expect(await repo.importRecords([makeRecord({ id: 'z' })], 'replace')).toBe(1);
    expect((await repo.getAll()).map((r) => r.id)).toEqual(['z']);
  });

  it('setItem が失敗したら reject し、保存済みの記録は変わらない。setItem は 1 回だけ', async () => {
    const { storage, data } = seed([makeRecord({ id: 'a' })]);
    const before = data.get(RECORDS_STORAGE_KEY);
    const setItem = jest.fn(async () => {
      throw new Error('fail');
    });
    const repo = setup({ ...storage, setItem });
    await expect(repo.importRecords([makeRecord({ id: 'z' })], 'replace')).rejects.toThrow('fail');
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(data.get(RECORDS_STORAGE_KEY)).toBe(before);
  });

  it('他の add と競合せず直列化される', async () => {
    const { storage } = seed([]);
    const repo = setup(storage);
    await Promise.all([repo.add(input), repo.importRecords([makeRecord({ id: 'z' })], 'merge'), repo.add(input)]);
    expect(await repo.getAll()).toHaveLength(3);
  });

  describe('deleteAll', () => {
    it('削除した記録を返し、保存は 1 回の setItem で空にする', async () => {
      const { storage, data } = createMemoryStorage();
      const repo = createRecordRepository(storage);
      await repo.add(input);
      await repo.add(input);
      const setItem = jest.spyOn(storage, 'setItem');
      const deleted = await repo.deleteAll();
      expect(deleted).toHaveLength(2);
      expect(setItem).toHaveBeenCalledTimes(1);
      expect(data.get(RECORDS_STORAGE_KEY)).toBe('[]');
      expect(await repo.getAll()).toEqual([]);
    });

    it('直前の add を待ってから削除する（直列化）', async () => {
      const repo = createRecordRepository(createMemoryStorage().storage);
      const [, deleted] = await Promise.all([repo.add(input), repo.deleteAll()]);
      expect(deleted).toHaveLength(1);
      expect(await repo.getAll()).toEqual([]);
    });

    it('setItem が失敗したら reject し、記録は変わらない', async () => {
      const { storage } = createMemoryStorage();
      const repo = createRecordRepository(storage);
      await repo.add(input);
      jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('disk'));
      await expect(repo.deleteAll()).rejects.toThrow('disk');
      expect(await repo.getAll()).toHaveLength(1);
    });
  });

  describe('新しいフィールド', () => {
    const rich = {
      ...input,
      oneLiner: 'ひとこと',
      starters: [
        {
          id: 's1',
          starter: 'いちばん心に残ったのは、',
          text: '嵐',
          createdAt: 'x',
        },
      ],
      quotes: [{ id: 'q1', text: '引用', page: '12', comment: null, createdAt: 'x' }],
      memos: [{ id: 'm1', text: 'メモ', page: null, createdAt: 'x' }],
      freeTexts: [{ id: 'f1', text: '文章', createdAt: 'x' }],
      favorite: true,
      shelfIds: ['sh1'],
    };

    it('保存して別の repository で読むと同じ値で戻る', async () => {
      const { storage } = createMemoryStorage();
      const added = await setup(storage).add(rich);
      expect(await createRecordRepository(storage).getAll()).toEqual([added]);
      expect(added).toMatchObject(rich);
    });

    it('update で変更でき、id・createdAt・spineColor は保たれる', async () => {
      const repo = setup(createMemoryStorage().storage);
      const added = await repo.add(rich);
      const updated = await repo.update(added.id, {
        ...rich,
        oneLiner: '変えた',
        favorite: false,
        shelfIds: [],
        quotes: [],
        memos: [],
        freeTexts: [],
        starters: [],
      });
      expect(updated).toMatchObject({
        id: added.id,
        createdAt: added.createdAt,
        spineColor: added.spineColor,
        oneLiner: '変えた',
        favorite: false,
        shelfIds: [],
      });
    });

    it('spineColor は既存件数に応じて spine-1 から順に割り当て、11 件目で戻る', async () => {
      const repo = setup(createMemoryStorage().storage);
      const colors: string[] = [];
      for (let i = 0; i < 11; i++) colors.push((await repo.add(input)).spineColor);
      expect(colors[0]).toBe('spine-1');
      expect(colors[9]).toBe('spine-10');
      expect(colors[10]).toBe('spine-1');
    });

    it('書き出し設定を変えても、保存済みの starter の文は変わらない', async () => {
      const { storage } = createMemoryStorage();
      const repo = setup(storage);
      await repo.add(rich);
      const settingsStore = createStarterSettingsStore(storage);
      const settings = defaultStarterSettings();
      await settingsStore.save({
        ...settings,
        items: settings.items.slice(1).map((i) => ({ ...i, text: '書き換え', enabled: false })),
      });
      expect((await repo.getAll())[0]?.starters[0]?.starter).toBe('いちばん心に残ったのは、');
    });

    it('removeShelfId は全記録から外し、ほかの本棚と件数は変わらない', async () => {
      const repo = setup(createMemoryStorage().storage);
      await repo.add({ ...input, shelfIds: ['a', 'b'] });
      await repo.add({ ...input, shelfIds: ['b'] });
      await repo.removeShelfId('b');
      const all = await repo.getAll();
      expect(all.map((r) => r.shelfIds)).toEqual([['a'], []]);
    });

    it('古い形式（review あり・新フィールドなし）は例外なく一覧から除かれる', async () => {
      const old = {
        id: 'o',
        title: 'T',
        review: 'x',
        status: 'planned',
        rating: null,
        createdAt: 'a',
        updatedAt: 'b',
      };
      const { storage } = createMemoryStorage({
        [RECORDS_STORAGE_KEY]: JSON.stringify([old]),
      });
      expect(await createRecordRepository(storage).getAll()).toEqual([]);
    });
  });
});
