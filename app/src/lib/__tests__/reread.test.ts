import { makeRecord } from '../../testUtils';
import { listPostReadMemos, removePostReadMemo, updatePostReadMemo } from '../reread';

const at = (n: number) => `2024-01-0${n}T00:00:00.000Z`;

describe('listPostReadMemos', () => {
  it('読後メモを createdAt の昇順に並べ、空白だけのものは除く', () => {
    const record = makeRecord({
      postReadMemos: [
        { id: 'p1', text: 'いちばん心に残ったのは、続き', createdAt: at(3) },
        { id: 'p2', text: '   ', createdAt: at(1) },
        { id: 'p3', text: '自由', createdAt: at(2) },
      ],
      quotes: [{ id: 'q1', text: '引用', page: null, comment: null, createdAt: at(1) }],
    });
    expect(listPostReadMemos(record).map((m) => m.id)).toEqual(['p3', 'p1']);
  });

  it('同じ createdAt なら保存の順', () => {
    const record = makeRecord({
      postReadMemos: [
        { id: 'b', text: 'x', createdAt: at(1) },
        { id: 'a', text: 'z', createdAt: at(1) },
      ],
    });
    expect(listPostReadMemos(record).map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('updatePostReadMemo / removePostReadMemo', () => {
  const record = makeRecord({
    oneLiner: 'ひとこと',
    rating: 4,
    postReadMemos: [
      { id: 'p1', text: '一つめ', createdAt: at(1) },
      { id: 'p2', text: '二つめ', createdAt: at(2) },
    ],
    memos: [{ id: 'm', text: 'メモ', page: null, createdAt: at(1) }],
  });

  it('指定した 1 件の本文だけを前後の空白を除いて差し替え、ほかの項目と書いた日は残す', () => {
    const input = updatePostReadMemo(record, 'p2', '  直した  \n');
    expect(input?.postReadMemos).toEqual([
      { id: 'p1', text: '一つめ', createdAt: at(1) },
      { id: 'p2', text: '直した', createdAt: at(2) },
    ]);
    expect(input?.oneLiner).toBe('ひとこと');
    expect(input?.rating).toBe(4);
    expect(input?.memos).toEqual(record.memos);
  });

  it('空白だけなら null', () => {
    expect(updatePostReadMemo(record, 'p1', ' \n ')).toBeNull();
  });

  it('削除は指定した 1 件だけを除く', () => {
    expect(removePostReadMemo(record, 'p1').postReadMemos.map((m) => m.id)).toEqual(['p2']);
  });
});
