import { createMemoryStorage } from '../../testUtils';
import type { KeyValueStorage } from '../storage';
import { createWriteDraftStore } from '../writeDraftStore';
import type { WriteDraft } from '../writeSession';

const draft: WriteDraft = {
  oneLiner: 'ひとこと',
  text: 'いちばん心に残ったのは、海',
  hints: ['いちばん心に残ったのは、', '意外だったのは、', 'この本を渡したいのは、'],
  usedHints: ['いちばん心に残ったのは、'],
};

describe('writeDraftStore', () => {
  it('記録 ID ごとに保存・読み込み・消去できる', async () => {
    const { storage, data } = createMemoryStorage();
    const store = createWriteDraftStore(storage);
    await store.save('r1', draft);
    expect(data.has('writeDraft.v2.r1')).toBe(true);
    expect(await store.load('r1')).toEqual(draft);
    expect(await store.load('r2')).toBeNull();
    await store.clear('r1');
    expect(await store.load('r1')).toBeNull();
  });

  it('壊れたデータや形の違うデータ（前の版のカードの下書きを含む）は null', async () => {
    const { storage } = createMemoryStorage({
      'writeDraft.v2.a': '{broken',
      'writeDraft.v2.b': JSON.stringify({ oneLiner: 1, text: '' }),
      'writeDraft.v2.c': 'null',
      'writeDraft.v2.d': JSON.stringify({ oneLiner: '', cards: [], selectedKey: null }),
    });
    const store = createWriteDraftStore(storage);
    for (const id of ['a', 'b', 'c', 'd']) expect(await store.load(id)).toBeNull();
  });

  it('ヒントの項目がない・文字列以外が混じるときは、文字列だけを残す', async () => {
    const { storage } = createMemoryStorage({
      'writeDraft.v2.a': JSON.stringify({ oneLiner: '', text: '書いた', hints: 'x', usedHints: ['a', 3, null] }),
    });
    expect(await createWriteDraftStore(storage).load('a')).toEqual({
      oneLiner: '',
      text: '書いた',
      hints: [],
      usedHints: ['a'],
    });
  });

  it('ストレージが例外を投げても load は null', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => Promise.reject(new Error('x')),
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    expect(await createWriteDraftStore(storage).load('r1')).toBeNull();
  });
});
