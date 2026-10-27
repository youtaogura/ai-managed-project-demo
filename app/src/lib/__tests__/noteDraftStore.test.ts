import { createMemoryStorage } from '../../testUtils';
import { createNoteDraftStore } from '../noteDraftStore';

const draft = { kind: 'quote' as const, page: '12', text: '本文', comment: 'ひとこと' };

describe('noteDraftStore', () => {
  it('記録 ID ごとに保存・読み込み・消去できる', async () => {
    const { storage, data } = createMemoryStorage();
    const store = createNoteDraftStore(storage);
    await store.save('r1', draft);
    expect(data.has('noteDraft.v1.r1')).toBe(true);
    expect(await store.load('r1')).toEqual(draft);
    expect(await store.load('r2')).toBeNull();
    await store.clear('r1');
    expect(await store.load('r1')).toBeNull();
  });

  it('壊れたデータや形の違うデータは null', async () => {
    const { storage } = createMemoryStorage({
      'noteDraft.v1.a': '{broken',
      'noteDraft.v1.b': JSON.stringify({ kind: 'x', page: '', text: '', comment: '' }),
      'noteDraft.v1.c': 'null',
    });
    const store = createNoteDraftStore(storage);
    expect(await store.load('a')).toBeNull();
    expect(await store.load('b')).toBeNull();
    expect(await store.load('c')).toBeNull();
  });

  it('読み込みに失敗しても null', async () => {
    const store = createNoteDraftStore({
      getItem: async () => {
        throw new Error('x');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    });
    expect(await store.load('a')).toBeNull();
  });
});
