import { createMemoryStorage } from '../../testUtils';
import type { KeyValueStorage } from '../storage';
import { createWriteDraftStore } from '../writeDraftStore';
import type { WriteDraft } from '../writeSession';

const card = {
  key: 'k1',
  kind: 'starter' as const,
  starter: 'いちばん心に残ったのは、',
  text: '続き',
};
const draft: WriteDraft = { oneLiner: 'ひとこと', cards: [card], selectedKey: 'k1' };

describe('writeDraftStore', () => {
  it('記録 ID ごとに保存・読み込み・消去できる', async () => {
    const { storage, data } = createMemoryStorage();
    const store = createWriteDraftStore(storage);
    await store.save('r1', draft);
    expect(data.has('writeDraft.v1.r1')).toBe(true);
    expect(await store.load('r1')).toEqual(draft);
    expect(await store.load('r2')).toBeNull();
    await store.clear('r1');
    expect(await store.load('r1')).toBeNull();
  });

  it('壊れたデータや形の違うデータは null', async () => {
    const { storage } = createMemoryStorage({
      'writeDraft.v1.a': '{broken',
      'writeDraft.v1.b': JSON.stringify({ oneLiner: 1, cards: [], selectedKey: null }),
      'writeDraft.v1.c': 'null',
      'writeDraft.v1.d': JSON.stringify({ oneLiner: '', cards: 'x', selectedKey: null }),
      'writeDraft.v1.e': JSON.stringify({ oneLiner: '', cards: [], selectedKey: 3 }),
    });
    const store = createWriteDraftStore(storage);
    for (const id of ['a', 'b', 'c', 'd', 'e']) expect(await store.load(id)).toBeNull();
  });

  it('不正なカードは捨て、選んでいたカードがなければ選択なし', async () => {
    const { storage } = createMemoryStorage({
      'writeDraft.v1.a': JSON.stringify({
        oneLiner: '',
        cards: [card, null, { ...card, key: 'k2', kind: 'quote' }, { ...card, key: 5 }],
        selectedKey: 'k2',
      }),
    });
    const loaded = await createWriteDraftStore(storage).load('a');
    expect(loaded?.cards).toEqual([card]);
    expect(loaded?.selectedKey).toBeNull();
  });

  it('前の版の下書き（starterId・page・asQuote 付き）も、余分な項目を捨てて読む', async () => {
    const old = { ...card, starterId: 's1', page: '12', asQuote: true };
    const { storage } = createMemoryStorage({
      'writeDraft.v1.a': JSON.stringify({ oneLiner: '', cards: [old], selectedKey: 'k1' }),
    });
    expect(await createWriteDraftStore(storage).load('a')).toEqual({ oneLiner: '', cards: [card], selectedKey: 'k1' });
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
