import { makeRecord } from '../../testUtils';
import {
  addNote,
  buildNoteItems,
  formatPage,
  isDraftEmpty,
  isNoteSubmittable,
  normalizePage,
  removeNote,
  updateNote,
} from '../notes';

const memo = (id: string, page: string | null, createdAt = '2024-01-01T00:00:00.000Z') => ({
  id,
  text: `m${id}`,
  page,
  createdAt,
});
const quote = (id: string, page: string | null, createdAt = '2024-01-01T00:00:00.000Z') => ({
  id,
  text: `q${id}`,
  page,
  comment: null,
  createdAt,
});

describe('buildNoteItems', () => {
  it('ページの数字の昇順に並べ、ページなし・数字なしは最後', () => {
    const record = makeRecord({
      memos: [memo('a', '88'), memo('b', null), memo('c', 'あとがき'), memo('d', '9')],
      quotes: [quote('e', 'p.88'), quote('f', '12-15'), quote('g', '')],
    });
    expect(buildNoteItems(record).map((i) => i.entry.id)).toEqual(['d', 'f', 'a', 'e', 'b', 'c', 'g']);
  });

  it('同じグループ内は createdAt の昇順、同時刻は配列の順', () => {
    const record = makeRecord({
      memos: [memo('a', null, '2024-01-03T00:00:00.000Z'), memo('b', null, '2024-01-01T00:00:00.000Z')],
      quotes: [quote('c', null, '2024-01-03T00:00:00.000Z')],
    });
    expect(buildNoteItems(record).map((i) => i.entry.id)).toEqual(['b', 'a', 'c']);
    expect(buildNoteItems(record).map((i) => i.kind)).toEqual(['memo', 'memo', 'quote']);
  });
});

describe('normalizePage', () => {
  it('空白を除き、空なら null、10 文字で切る', () => {
    expect(normalizePage('  88 ')).toBe('88');
    expect(normalizePage('   ')).toBeNull();
    expect(normalizePage('12345678901234')).toBe('1234567890');
  });
});

describe('formatPage / draft helpers', () => {
  it('数字で始まるページだけ p. を付ける', () => {
    expect(formatPage('88')).toBe('p.88');
    expect(formatPage('p.88')).toBe('p.88');
    expect(formatPage('あとがき')).toBe('あとがき');
  });
  it('本文が空白だけなら送信できない', () => {
    expect(isNoteSubmittable({ text: ' \n' })).toBe(false);
    expect(isNoteSubmittable({ text: 'a' })).toBe(true);
  });
  it('すべて空のときだけ空の下書き', () => {
    expect(isDraftEmpty({ kind: 'quote', page: '', text: '', comment: '' })).toBe(true);
    expect(isDraftEmpty({ kind: 'memo', page: '1', text: '', comment: '' })).toBe(false);
  });
});

describe('addNote / updateNote / removeNote', () => {
  const options = { now: () => '2024-05-05T00:00:00.000Z', generateId: () => 'new' };
  const record = makeRecord({ title: 'T', shelfIds: ['s'], memos: [memo('a', '1')], quotes: [quote('b', '2')] });

  it('メモを追加し、ほかの項目は変えない', () => {
    const input = addNote(record, { kind: 'memo', page: ' 5 ', text: ' 本文 ', comment: 'x' }, options);
    expect(input?.memos).toHaveLength(2);
    expect(input?.memos[1]).toEqual({ id: 'new', text: '本文', page: '5', createdAt: '2024-05-05T00:00:00.000Z' });
    expect(input?.quotes).toEqual(record.quotes);
    expect(input?.title).toBe('T');
    expect(input?.shelfIds).toEqual(['s']);
    expect(input).not.toHaveProperty('id');
  });

  it('引用のひとことは空なら null。本文が空なら null を返す', () => {
    const input = addNote(record, { kind: 'quote', page: '', text: '一文', comment: ' ' }, options);
    expect(input?.quotes[1]).toMatchObject({ id: 'new', page: null, comment: null });
    expect(addNote(record, { kind: 'memo', page: '', text: '  ', comment: '' }, options)).toBeNull();
    const withComment = addNote(record, { kind: 'quote', page: '', text: '一文', comment: ' ひとこと ' });
    expect(withComment?.quotes[1].comment).toBe('ひとこと');
  });

  it('同じ種類のまま更新する', () => {
    const input = updateNote(record, { kind: 'memo', id: 'a' }, { kind: 'memo', page: '9', text: '直した', comment: '' });
    expect(input?.memos).toEqual([{ id: 'a', text: '直した', page: '9', createdAt: '2024-01-01T00:00:00.000Z' }]);
    const q = updateNote(record, { kind: 'quote', id: 'b' }, { kind: 'quote', page: '', text: '直した', comment: 'c' });
    expect(q?.quotes[0]).toMatchObject({ id: 'b', page: null, comment: 'c' });
  });

  it('種類を切り替えると元を消して id と createdAt を引き継ぐ', () => {
    const input = updateNote(record, { kind: 'memo', id: 'a' }, { kind: 'quote', page: '1', text: 'x', comment: 'c' });
    expect(input?.memos).toEqual([]);
    expect(input?.quotes.map((q) => q.id)).toEqual(['b', 'a']);
    expect(input?.quotes[1]).toMatchObject({ createdAt: '2024-01-01T00:00:00.000Z', comment: 'c' });
  });

  it('対象が無い・本文が空なら null', () => {
    expect(updateNote(record, { kind: 'memo', id: 'zz' }, { kind: 'memo', page: '', text: 'x', comment: '' })).toBeNull();
    expect(updateNote(record, { kind: 'memo', id: 'a' }, { kind: 'memo', page: '', text: ' ', comment: '' })).toBeNull();
  });

  it('削除する', () => {
    expect(removeNote(record, { kind: 'memo', id: 'a' }).memos).toEqual([]);
    expect(removeNote(record, { kind: 'quote', id: 'b' }).quotes).toEqual([]);
    expect(removeNote(record, { kind: 'quote', id: 'b' }).memos).toHaveLength(1);
  });

  it('既定の id と時刻で追加できる', () => {
    const input = addNote(record, { kind: 'memo', page: '', text: 'x', comment: '' });
    expect(input?.memos[1].id).toEqual(expect.any(String));
    expect(input?.memos[1].createdAt).toMatch(/^\d{4}-/);
  });
});
