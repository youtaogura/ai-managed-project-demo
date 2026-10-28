import { createMemoryStorage, makeRecord } from '../../testUtils';
import { parseRecords } from '../recordGuard';
import { createRecordRepository } from '../recordRepository';
import {
  CURRENT_SCHEMA_VERSION,
  LEGACY_STARTER_SETTINGS_KEY,
  RECORDS_KEY,
  SCHEMA_VERSION_STORAGE_KEY,
  migrateRecords,
  toPostReadMemos,
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

  it('版が最新なら何も書かない', async () => {
    const { storage } = createMemoryStorage({
      [RECORDS_KEY]: JSON.stringify([old]),
      [SCHEMA_VERSION_STORAGE_KEY]: '4',
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
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('4');
  });

  it('records.v1 が未保存なら版だけ最新にする', async () => {
    const { storage, data } = createMemoryStorage();
    await migrateRecords(storage);
    expect(data.has(RECORDS_KEY)).toBe(false);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('4');
  });

  it('版が壊れた値なら未設定として扱う', async () => {
    const { storage, data } = createMemoryStorage({ [SCHEMA_VERSION_STORAGE_KEY]: 'abc' });
    await migrateRecords(storage);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('4');
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
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('4');
  });
});

const at = (n: number) => `2025-10-0${n}T00:00:00.000Z`;

/** 版 3 で保存されていた記録（書き出し・自由記述・引用の starter があった） */
function v3Record(overrides: Record<string, unknown> = {}) {
  const { postReadMemos: _drop, ...rest } = makeRecord({ id: 'v3', status: 'completed', oneLiner: 'ひとこと' });
  return {
    ...rest,
    starters: [
      { id: 's1', starter: 'いちばん心に残ったのは、', text: ' 暗い森 ', createdAt: at(3) },
      { id: 's2', starter: '意外だったのは、', text: '   ', createdAt: at(1) },
    ],
    freeTexts: [
      { id: 'f1', text: '夜空を見上げられなかった。', createdAt: at(2) },
      { id: 'f2', text: '', createdAt: at(4) },
    ],
    quotes: [
      { id: 'q1', text: '宇宙は暗い森だ。', page: '440', comment: null, starter: '読み終えて、見方が変わったのは、', createdAt: at(1) },
      { id: 'q2', text: '弱小と無知は', page: null, comment: 'いい', createdAt: at(1) },
    ],
    ...overrides,
  };
}

describe('版 4: 読後メモへの移行', () => {
  it('版 3 の記録を読後メモの形に直し、アプリの読み込みを通る（id と createdAt は引き継ぎ、書いた順）', async () => {
    const { storage, data } = createMemoryStorage({
      [RECORDS_KEY]: JSON.stringify([v3Record()]),
      [SCHEMA_VERSION_STORAGE_KEY]: '3',
    });
    expect(await migrateRecords(storage)).toBe(true);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('4');
    const [record] = await createRecordRepository(storage).getAll();
    expect(record?.postReadMemos).toEqual([
      { id: 'f1', text: '夜空を見上げられなかった。', createdAt: at(2) },
      { id: 's1', text: 'いちばん心に残ったのは、暗い森', createdAt: at(3) },
    ]);
    expect(record).not.toHaveProperty('starters');
    expect(record).not.toHaveProperty('freeTexts');
    expect(record?.quotes).toEqual([
      { id: 'q1', text: '宇宙は暗い森だ。', page: '440', comment: null, createdAt: at(1) },
      { id: 'q2', text: '弱小と無知は', page: null, comment: 'いい', createdAt: at(1) },
    ]);
    expect(record?.oneLiner).toBe('ひとこと');
  });

  it('書き出しの設定の保存キーを消す', async () => {
    const { storage, data } = createMemoryStorage({
      [LEGACY_STARTER_SETTINGS_KEY]: '{"enabled":true}',
      [SCHEMA_VERSION_STORAGE_KEY]: '3',
    });
    await migrateRecords(storage);
    expect(data.has(LEGACY_STARTER_SETTINGS_KEY)).toBe(false);
  });

  it('キーの削除に失敗しても移行は終わる', async () => {
    const { storage, data } = createMemoryStorage({ [RECORDS_KEY]: JSON.stringify([v3Record()]) });
    const failing: KeyValueStorage = { ...storage, removeItem: jest.fn().mockRejectedValue(new Error('x')) };
    expect(await migrateRecords(failing)).toBe(true);
    expect(data.get(SCHEMA_VERSION_STORAGE_KEY)).toBe('4');
  });

  it('同じ時刻なら、もとからある読後メモ → 書き出し → 自由記述の順', () => {
    const existing = { id: 'p0', text: '前から', createdAt: at(1) };
    const result = toPostReadMemos(
      v3Record({
        postReadMemos: [existing],
        starters: [{ id: 's', starter: 'あ、', text: 'い', createdAt: at(1) }],
        freeTexts: [{ id: 'f', text: 'う', createdAt: at(1) }],
      }),
    );
    expect(parseRecords([result])[0]?.postReadMemos.map((m) => m.id)).toEqual(['p0', 's', 'f']);
  });

  it('片方だけあっても直す。引用の starter だけでも外す', () => {
    const { freeTexts: _f, ...onlyStarters } = v3Record();
    expect(parseRecords([toPostReadMemos(onlyStarters)])[0]?.postReadMemos).toHaveLength(1);
    const { starters: _s, freeTexts: _f2, ...onlyQuote } = v3Record();
    const fixed = toPostReadMemos({ ...onlyQuote, postReadMemos: [] });
    expect(parseRecords([fixed])[0]?.quotes[0]).not.toHaveProperty('starter');
  });

  it('直すものがなければ同じ値を返す（書き込まない）', () => {
    const current = makeRecord();
    expect(toPostReadMemos(current)).toBe(current);
    expect(toPostReadMemos('broken')).toBe('broken');
  });

  it.each<[string, Record<string, unknown>]>([
    ['starters が配列でない', { starters: 'x' }],
    ['starters の要素が壊れている', { starters: [{ id: 's' }] }],
    ['freeTexts の要素が壊れている', { freeTexts: [null] }],
    ['postReadMemos が配列でない', { postReadMemos: {} }],
  ])('%s なら変えずに返す（読み込みの検査で弾かれる）', (_name, overrides) => {
    const broken = v3Record(overrides);
    expect(toPostReadMemos(broken)).toBe(broken);
  });

  it('引用が配列でない記録は引用に触れない', () => {
    const result = toPostReadMemos(v3Record({ quotes: 'x' }));
    expect(result).toMatchObject({ quotes: 'x' });
  });
});
