import { createMemoryStorage } from '../../testUtils';
import {
  CURRENT_SCHEMA_VERSION,
  RECORDS_KEY,
  SCHEMA_VERSION_STORAGE_KEY,
  migrateRecords,
} from '../recordMigration';
import type { KeyValueStorage } from '../storage';

const old = { id: 'a', title: 'T', isbn: '9784065199817' };
const noIsbn = { id: 'b', title: 'U', isbn: null };

describe('migrateRecords', () => {
  it('source のない要素にだけ source を足し、不正な要素も順序も保つ。最後に版を上げる', async () => {
    const withSource = { id: 'c', source: { provider: 'ndl', ndlId: '1' } };
    const items = [old, 'broken', noIsbn, withSource, { id: 'd', isbn: 5 }, { id: 'e', isbn: '' }];
    const { storage, data } = createMemoryStorage({ [RECORDS_KEY]: JSON.stringify(items) });
    expect(await migrateRecords(storage)).toBe(true);
    expect(JSON.parse(data.get(RECORDS_KEY) ?? '')).toEqual([
      { ...old, source: { provider: 'openbd', isbn: '9784065199817' } },
      'broken',
      { ...noIsbn, source: { provider: 'manual' } },
      withSource,
      { id: 'd', isbn: 5, source: { provider: 'manual' } },
      { id: 'e', isbn: '', source: { provider: 'manual' } },
    ]);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it('版が 2 以上なら何も書かない', async () => {
    const { storage } = createMemoryStorage({
      [RECORDS_KEY]: JSON.stringify([old]),
      [SCHEMA_VERSION_STORAGE_KEY]: '2',
    });
    const setItem = jest.spyOn(storage, 'setItem');
    await migrateRecords(storage);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('2 回目は書き込まない（冪等）', async () => {
    const { storage } = createMemoryStorage({ [RECORDS_KEY]: JSON.stringify([old]) });
    await migrateRecords(storage);
    const setItem = jest.spyOn(storage, 'setItem');
    await migrateRecords(storage);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('すべて source 済みなら記録は書かず版だけ上げる', async () => {
    const { storage, data } = createMemoryStorage({
      [RECORDS_KEY]: JSON.stringify([{ id: 'c', source: { provider: 'manual' } }]),
    });
    const setItem = jest.spyOn(storage, 'setItem');
    await migrateRecords(storage);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('2');
  });

  it('records.v1 が未保存なら版だけ 2 にする', async () => {
    const { storage, data } = createMemoryStorage();
    await migrateRecords(storage);
    expect(data.has(RECORDS_KEY)).toBe(false);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('2');
  });

  it('版が壊れた値なら未設定として扱う', async () => {
    const { storage, data } = createMemoryStorage({ [SCHEMA_VERSION_STORAGE_KEY]: 'abc' });
    await migrateRecords(storage);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('2');
  });

  it.each(['{broken', '{"a":1}'])('壊れた/配列でない JSON (%s) は書き換えず版も上げない', async (raw) => {
    const { storage, data } = createMemoryStorage({ [RECORDS_KEY]: raw });
    expect(await migrateRecords(storage)).toBe(false);
    expect(data.get(RECORDS_KEY)).toBe(raw);
    expect(data.has(SCHEMA_VERSION_STORAGE_KEY)).toBe(false);
  });

  it('記録の書き込みに失敗しても throw せず、版は上げず、元の記録が残る', async () => {
    const { storage, data } = createMemoryStorage({ [RECORDS_KEY]: JSON.stringify([old]) });
    const failing: KeyValueStorage = { ...storage, setItem: jest.fn().mockRejectedValue(new Error('x')) };
    await expect(migrateRecords(failing)).resolves.toBe(false);
    expect(data.get(RECORDS_KEY)).toBe(JSON.stringify([old]));
    expect(data.has(SCHEMA_VERSION_STORAGE_KEY)).toBe(false);
  });

  it('読み取りに失敗しても throw しない', async () => {
    const { storage } = createMemoryStorage();
    const failing: KeyValueStorage = { ...storage, getItem: jest.fn().mockRejectedValue(new Error('x')) };
    await expect(migrateRecords(failing)).resolves.toBe(false);
  });

  it('版の書き込みだけ失敗しても、再実行で収束する', async () => {
    const { storage, data } = createMemoryStorage({ [RECORDS_KEY]: JSON.stringify([old]) });
    const flaky: KeyValueStorage = {
      ...storage,
      setItem: async (key, value) => {
        if (key === SCHEMA_VERSION_STORAGE_KEY) throw new Error('x');
        await storage.setItem(key, value);
      },
    };
    await migrateRecords(flaky);
    const afterFirst = data.get(RECORDS_KEY);
    await migrateRecords(storage);
    expect(data.get(RECORDS_KEY)).toBe(afterFirst);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('2');
  });
});
