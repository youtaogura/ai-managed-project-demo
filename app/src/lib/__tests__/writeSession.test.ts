import { makeRecord } from '../../testUtils';
import { HINTS } from '../hints';
import { appendHint, buildWriteInput, isUnchanged, restoreHints } from '../writeSession';

const zero = () => 0;

describe('appendHint', () => {
  it('空ならそのまま入れる（改行しない）', () => {
    expect(appendHint('', 'いちばん心に残ったのは、')).toBe('いちばん心に残ったのは、');
  });

  it('文章があれば一段改行してから最後に入れる', () => {
    expect(appendHint('猫がいた。', '意外だったのは、')).toBe('猫がいた。\n意外だったのは、');
  });

  it('すでに改行で終わっていれば改行を足さない', () => {
    expect(appendHint('猫がいた。\n', '意外だったのは、')).toBe('猫がいた。\n意外だったのは、');
  });
});

describe('restoreHints', () => {
  it('下書きのヒントが 3 つとも一覧にあればそのまま使う', () => {
    const saved = [HINTS.feeling[2], HINTS.self[0], HINTS.recommend[1]] as string[];
    expect(restoreHints(saved, 4, zero)).toEqual(saved);
  });

  it('数が違う・一覧にない文があるときは選び直す', () => {
    const picked = [HINTS.feeling[0], HINTS.content[0], HINTS.recommend[0]];
    expect(restoreHints([], 4, zero)).toEqual(picked);
    expect(restoreHints(['自分で足した文、', HINTS.self[0] as string, HINTS.recommend[1] as string], 4, zero)).toEqual(
      picked,
    );
  });

  it('「あんまり」の本で選び直すと、合わなかったときのヒントが入る', () => {
    expect(restoreHints([], 2.9, zero)).toContain(HINTS.mismatch[0]);
  });
});

describe('isUnchanged', () => {
  it('読後メモが空白だけで、ひとことが開いたときのままなら true', () => {
    expect(isUnchanged(makeRecord({ oneLiner: 'いい本' }), { oneLiner: ' いい本 ', text: ' \n ' })).toBe(true);
    expect(isUnchanged(makeRecord({ oneLiner: null }), { oneLiner: '', text: '' })).toBe(true);
  });

  it('どちらかが変わっていれば false', () => {
    expect(isUnchanged(makeRecord({ oneLiner: 'いい本' }), { oneLiner: '別', text: '' })).toBe(false);
    expect(isUnchanged(makeRecord({ oneLiner: null }), { oneLiner: '', text: '書いた' })).toBe(false);
  });
});

describe('buildWriteInput', () => {
  const record = makeRecord({
    rating: 4,
    postReadMemos: [{ id: 'p0', text: '前', createdAt: '2020-01-01T00:00:00.000Z' }],
    quotes: [{ id: 'q0', text: '引用', page: null, comment: null, createdAt: '2020-01-01T00:00:00.000Z' }],
    memos: [{ id: 'm0', text: 'メモ', page: null, createdAt: '2020-01-01T00:00:00.000Z' }],
  });

  it('ひとことを整えて保存し、読後メモを 1 件だけ既存の後ろに足す。ほかの項目はそのまま', () => {
    const input = buildWriteInput(
      record,
      { oneLiner: '  新しい  ', text: '\n いちばん心に残ったのは、海\n意外だったのは、空 \n' },
      { now: () => 'NOW', generateId: () => 'id1' },
    );
    expect(input.oneLiner).toBe('新しい');
    expect(input.postReadMemos).toEqual([
      record.postReadMemos[0],
      { id: 'id1', text: 'いちばん心に残ったのは、海\n意外だったのは、空', createdAt: 'NOW' },
    ]);
    expect(input.quotes).toEqual(record.quotes);
    expect(input.memos).toEqual(record.memos);
    expect(input.rating).toBe(4);
  });

  it('読後メモが空白だけなら足さない。ひとことが空なら null', () => {
    const input = buildWriteInput(makeRecord({ oneLiner: 'あった' }), { oneLiner: ' ', text: '  ' });
    expect(input.oneLiner).toBeNull();
    expect(input.postReadMemos).toEqual([]);
  });

  it('id と時刻は省略できる', () => {
    const input = buildWriteInput(makeRecord(), { oneLiner: '', text: '書いた' });
    expect(input.postReadMemos[0]?.id).toBeTruthy();
    expect(input.postReadMemos[0]?.createdAt).toMatch(/^\d{4}-/);
  });
});
