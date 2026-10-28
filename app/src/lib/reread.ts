import type { MediaRecord, NewRecordInput, PostReadMemo } from '../types/record';
import { recordToInput } from './notes';

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

/** 読後メモ 1 件の本文を差し替えた保存用の入力。本文が空白だけなら null（保存しない）。 */
export function updatePostReadMemo(record: MediaRecord, id: string, text: string): NewRecordInput | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return withPostReadMemos(
    record,
    record.postReadMemos.map((memo) => (memo.id === id ? { ...memo, text: trimmed } : memo)),
  );
}

/** 読後メモ 1 件を除いた保存用の入力。 */
export function removePostReadMemo(record: MediaRecord, id: string): NewRecordInput {
  return withPostReadMemos(
    record,
    record.postReadMemos.filter((memo) => memo.id !== id),
  );
}

function withPostReadMemos(record: MediaRecord, postReadMemos: PostReadMemo[]): NewRecordInput {
  return { ...recordToInput(record, record.memos, record.quotes), postReadMemos };
}
