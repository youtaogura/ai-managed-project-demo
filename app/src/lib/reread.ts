import type { MediaRecord, PostReadMemo } from '../types/record';

/** 読後メモを書いた順（createdAt の順、同じなら保存の順）に並べる。本文が空のものは除く。 */
export function listPostReadMemos(record: Pick<MediaRecord, 'postReadMemos'>): PostReadMemo[] {
  return record.postReadMemos
    .filter((memo) => memo.text.trim() !== '')
    .map((memo, index) => ({ memo, index }))
    .sort((a, b) => {
      const x = a.memo.createdAt;
      const y = b.memo.createdAt;
      if (x !== y) return x < y ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ memo }) => memo);
}

/** この本をひとことで・読後メモ・引用・メモのどれもなければ false。 */
export function hasRereadContent(record: Pick<MediaRecord, 'oneLiner' | 'postReadMemos' | 'quotes' | 'memos'>): boolean {
  return (
    (record.oneLiner ?? '').trim() !== '' ||
    listPostReadMemos(record).length > 0 ||
    record.quotes.some((q) => q.text.trim() !== '') ||
    record.memos.some((m) => m.text.trim() !== '')
  );
}
