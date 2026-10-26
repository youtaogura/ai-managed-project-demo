import { defaultStarterSettings } from '../starterDefaults';
import { makeRecord } from '../../testUtils';
import type { StarterSettings } from '../../types/starter';
import {
  buildWriteInput,
  createCards,
  createFreeCard,
  hasAnythingToSave,
  isDraftBlank,
  replaceUnwrittenCards,
  restoreCards,
  type WriteCard,
} from '../writeSession';

const settings = (patch: Partial<StarterSettings> = {}): StarterSettings => ({ ...defaultStarterSettings(), ...patch });
const keys = () => {
  let n = 0;
  return () => `k${++n}`;
};
const zero = () => 0;
const written = (card: WriteCard, text = '書いた'): WriteCard => ({ ...card, text });

describe('createCards', () => {
  it('設定の数だけ重複なく作る', () => {
    const cards = createCards(settings(), zero, keys());
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.starterId)).size).toBe(3);
    expect(cards.every((c) => c.kind === 'starter' && c.text === '' && !c.asQuote)).toBe(true);
  });

  it('オフなら 0 枚、オンが少なければあるだけ', () => {
    expect(createCards(settings({ enabled: false }))).toEqual([]);
    const s = settings();
    const only = { ...s, items: s.items.map((item, i) => ({ ...item, enabled: i === 0 })) };
    expect(createCards(only)).toHaveLength(1);
  });

  it('キーを省略しても一意', () => {
    const cards = createCards(settings());
    expect(new Set(cards.map((c) => c.key)).size).toBe(3);
    expect(createFreeCard().kind).toBe('free');
  });
});

describe('replaceUnwrittenCards', () => {
  it('書いていないカードを今出ていない書き出しに入れ替え、書いたカードは残す', () => {
    const s = settings();
    const cards = createCards(s, zero, keys());
    const [a, b, c] = cards as [WriteCard, WriteCard, WriteCard];
    const next = replaceUnwrittenCards([written(a), b, c], s, zero, keys());
    expect(next).toHaveLength(3);
    expect(next[0]).toEqual(written(a));
    const before = new Set(cards.map((x) => x.starterId));
    expect(next.slice(1).every((x) => !before.has(x.starterId))).toBe(true);
    expect(new Set(next.map((x) => x.starterId)).size).toBe(3);
  });

  it('自由記述は動かさない。書いていないカードがなければそのまま', () => {
    const s = settings();
    const cards = createCards(s, zero, keys()).map((c) => written(c));
    const free = createFreeCard('f');
    const list = [...cards, free];
    expect(replaceUnwrittenCards(list, s)).toEqual(list);
  });

  it('オンの書き出しが count 以下なら顔ぶれは変わらない', () => {
    const base = settings();
    const s = { ...base, items: base.items.map((item, i) => ({ ...item, enabled: i < 3 })) };
    const cards = createCards(s, zero, keys());
    const next = replaceUnwrittenCards(cards, s, zero, keys());
    expect(next.map((c) => c.starterId).sort()).toEqual(cards.map((c) => c.starterId).sort());
  });

  it('書いたカードの書き出しは入れ替え先に出ない', () => {
    const base = settings();
    const s = { ...base, items: base.items.map((item, i) => ({ ...item, enabled: i < 4 })) };
    const cards = createCards(s, zero, keys());
    const [a, b, c] = cards as [WriteCard, WriteCard, WriteCard];
    const next = replaceUnwrittenCards([written(a), b, c], s, zero, keys());
    expect(next.filter((x) => x.starterId === a.starterId)).toHaveLength(1);
    expect(next).toHaveLength(3);
  });
});

describe('restoreCards', () => {
  it('顔ぶれをそのまま戻す（抽選しない）', () => {
    const s = settings();
    const cards = [...createCards(s, zero, keys()).map((c) => written(c)), createFreeCard('f')];
    expect(restoreCards(cards, s, () => 0.99)).toEqual(cards);
  });

  it('設定から消えた・オフの書き出しは捨て、足りない分を補う', () => {
    const s = settings();
    const cards = createCards(s, zero, keys());
    const gone = {
      ...s,
      items: s.items.map((item) => (item.id === cards[0]?.starterId ? { ...item, enabled: false } : item)),
    };
    const restored = restoreCards([...cards, createFreeCard('f')], gone, zero, keys());
    const starters = restored.filter((c) => c.kind === 'starter');
    expect(starters).toHaveLength(3);
    expect(starters.some((c) => c.starterId === cards[0]?.starterId)).toBe(false);
    expect(restored[restored.length - 1]?.key).toBe('f');
  });

  it('自由記述がなければ末尾に補う', () => {
    const s = settings();
    const cards = createCards(s, zero, keys());
    const gone = { ...s, items: s.items.map((item) => (item.id === cards[0]?.starterId ? { ...item, enabled: false } : item)) };
    expect(restoreCards(cards, gone, zero, keys())).toHaveLength(3);
  });

  it('書き出しがオフなら自由記述だけ', () => {
    const cards = [...createCards(settings(), zero, keys()), createFreeCard('f')];
    expect(restoreCards(cards, settings({ enabled: false }))).toEqual([createFreeCard('f')]);
  });
});

describe('保存内容', () => {
  const [a, b] = createCards(settings(), zero, keys()) as [WriteCard, WriteCard];

  it('本文があるかどうか（空白だけは空）', () => {
    expect(hasAnythingToSave('  ', [a])).toBe(false);
    expect(hasAnythingToSave('', [written(a, ' ')])).toBe(false);
    expect(hasAnythingToSave('ひとこと', [])).toBe(true);
    expect(hasAnythingToSave('', [written(a)])).toBe(true);
    expect(isDraftBlank({ oneLiner: '', cards: [a] })).toBe(true);
    expect(isDraftBlank({ oneLiner: '', cards: [{ ...a, page: '3' }] })).toBe(false);
    expect(isDraftBlank({ oneLiner: 'x', cards: [] })).toBe(false);
  });

  it('続き・引用・自由記述を既存データの後ろに足し、oneLiner を trim する', () => {
    const record = makeRecord({
      oneLiner: '前の',
      starters: [{ id: 's0', starter: '古い書き出し', text: '古い', createdAt: '2020-01-01T00:00:00.000Z' }],
      quotes: [{ id: 'q0', text: 'q', page: null, comment: null, createdAt: '2020-01-01T00:00:00.000Z' }],
      memos: [{ id: 'm0', text: 'm', page: null, createdAt: '2020-01-01T00:00:00.000Z' }],
      freeTexts: [{ id: 'f0', text: 'f', createdAt: '2020-01-01T00:00:00.000Z' }],
      rating: 4,
    });
    let n = 0;
    const input = buildWriteInput(
      record,
      {
        oneLiner: '  新しい  ',
        cards: [
          written(a, ' 続き '),
          { ...written(b, '引用'), asQuote: true, page: ' 12 ' },
          createFreeCard('x'),
          { ...createFreeCard('y'), text: ' 自由 ' },
        ],
      },
      { now: () => 'NOW', generateId: () => `id${++n}` },
    );
    expect(input.oneLiner).toBe('新しい');
    expect(input.starters).toEqual([
      record.starters[0],
      { id: 'id1', starter: a.starter, text: '続き', createdAt: 'NOW' },
    ]);
    expect(input.quotes).toEqual([
      record.quotes[0],
      { id: 'id2', text: '引用', page: '12', comment: null, createdAt: 'NOW' },
    ]);
    expect(input.freeTexts).toEqual([record.freeTexts[0], { id: 'id3', text: '自由', createdAt: 'NOW' }]);
    expect(input.memos).toEqual(record.memos);
    expect(input.rating).toBe(4);
  });

  it('oneLiner が空なら null。id と時刻は省略できる', () => {
    const input = buildWriteInput(makeRecord({ oneLiner: 'あった' }), { oneLiner: ' ', cards: [written(a)] });
    expect(input.oneLiner).toBeNull();
    expect(input.starters[0]?.id).toBeTruthy();
    expect(input.starters[0]?.createdAt).toMatch(/^\d{4}-/);
  });
});
