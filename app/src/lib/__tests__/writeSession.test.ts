import { makeRecord } from '../../testUtils';
import { HINTS } from '../hints';
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

const keys = () => {
  let n = 0;
  return () => `k${++n}`;
};
const zero = () => 0;
const written = (card: WriteCard, text = '書いた'): WriteCard => ({ ...card, text });
const hintOf = (card: WriteCard | undefined) => card?.starter;

describe('createCards', () => {
  it('ヒントを 3 つ（感じたこと・中身など・人に勧める）選んで、空のカードにする', () => {
    const cards = createCards(4.5, zero, keys());
    expect(cards.map((c) => c.starter)).toEqual([HINTS.feeling[0], HINTS.content[0], HINTS.recommend[0]]);
    expect(cards.every((c) => c.kind === 'starter' && c.text === '')).toBe(true);
    expect(cards.map((c) => c.key)).toEqual(['k1', 'k2', 'k3']);
  });

  it('「あんまり」の本では合わなかったときのヒントが入る', () => {
    expect(hintOf(createCards(2, zero, keys())[1])).toBe(HINTS.mismatch[0]);
  });

  it('キーを省略しても一意', () => {
    const cards = createCards(null);
    expect(new Set(cards.map((c) => c.key)).size).toBe(3);
    expect(createFreeCard().kind).toBe('free');
  });
});

describe('replaceUnwrittenCards', () => {
  it('書いていないカードを今出ていないヒントに入れ替え、書いたカードは残す', () => {
    const cards = createCards(4, zero, keys());
    const [a, b, c] = cards as [WriteCard, WriteCard, WriteCard];
    const next = replaceUnwrittenCards([written(a), b, c], 4, zero, keys());
    expect(next).toHaveLength(3);
    expect(next[0]).toEqual(written(a));
    const before = new Set(cards.map((x) => x.starter));
    expect(next.slice(1).every((x) => !before.has(x.starter))).toBe(true);
    expect(next.slice(1).every((x) => x.text === '')).toBe(true);
  });

  it('自由記述は動かさない。書いていないカードがなければそのまま', () => {
    const cards = createCards(4, zero, keys()).map((c) => written(c));
    const list = [...cards, createFreeCard('f')];
    expect(replaceUnwrittenCards(list, 4)).toEqual(list);
  });

  it('ヒントのカードが 3 つより多い下書きでは、余りはそのまま', () => {
    const extra: WriteCard = { key: 'x', kind: 'starter', starter: '古いヒント、', text: '' };
    const next = replaceUnwrittenCards([...createCards(4, zero, keys()), extra], 4, zero, keys());
    expect(next[3]).toEqual(extra);
  });
});

describe('restoreCards', () => {
  it('顔ぶれをそのまま戻す（抽選しない）', () => {
    const cards = [...createCards(4, zero, keys()).map((c) => written(c)), createFreeCard('f')];
    expect(restoreCards(cards, 4, () => 0.99)).toEqual(cards);
  });

  it('ヒントのカードがない下書きには、ヒントを選んで前に足す', () => {
    const restored = restoreCards([written(createFreeCard('f'))], 4, zero, keys());
    expect(restored.map((c) => c.kind)).toEqual(['starter', 'starter', 'starter', 'free']);
    expect(restored[3]?.text).toBe('書いた');
  });
});

describe('保存内容', () => {
  const [a] = createCards(4, zero, keys()) as [WriteCard];

  it('本文があるかどうか（空白だけは空）', () => {
    expect(hasAnythingToSave('  ', [a])).toBe(false);
    expect(hasAnythingToSave('', [written(a, ' ')])).toBe(false);
    expect(hasAnythingToSave('ひとこと', [])).toBe(true);
    expect(hasAnythingToSave('', [written(a)])).toBe(true);
    expect(isDraftBlank({ oneLiner: '', cards: [a] })).toBe(true);
    expect(isDraftBlank({ oneLiner: '', cards: [written(a, ' ')] })).toBe(false);
    expect(isDraftBlank({ oneLiner: 'x', cards: [] })).toBe(false);
  });

  it('書いたカードを読後メモとして既存の後ろに足し（ヒント + 続き）、oneLiner を trim する。引用・メモは変えない', () => {
    const record = makeRecord({
      oneLiner: '前の',
      postReadMemos: [{ id: 'p0', text: '前の読後メモ', createdAt: '2020-01-01T00:00:00.000Z' }],
      quotes: [{ id: 'q0', text: 'q', page: null, comment: null, createdAt: '2020-01-01T00:00:00.000Z' }],
      memos: [{ id: 'm0', text: 'm', page: null, createdAt: '2020-01-01T00:00:00.000Z' }],
      rating: 4,
    });
    let n = 0;
    const input = buildWriteInput(
      record,
      {
        oneLiner: '  新しい  ',
        cards: [written(a, ' 続き '), createFreeCard('x'), { ...createFreeCard('y'), text: ' 自由 ' }],
      },
      { now: () => 'NOW', generateId: () => `id${++n}` },
    );
    expect(input.oneLiner).toBe('新しい');
    expect(input.postReadMemos).toEqual([
      record.postReadMemos[0],
      { id: 'id1', text: `${a.starter}続き`, createdAt: 'NOW' },
      { id: 'id2', text: '自由', createdAt: 'NOW' },
    ]);
    expect(input.quotes).toEqual(record.quotes);
    expect(input.memos).toEqual(record.memos);
    expect(input.rating).toBe(4);
  });

  it('oneLiner が空なら null。id と時刻は省略できる', () => {
    const input = buildWriteInput(makeRecord({ oneLiner: 'あった' }), { oneLiner: ' ', cards: [written(a)] });
    expect(input.oneLiner).toBeNull();
    expect(input.postReadMemos[0]?.id).toBeTruthy();
    expect(input.postReadMemos[0]?.createdAt).toMatch(/^\d{4}-/);
  });
});
