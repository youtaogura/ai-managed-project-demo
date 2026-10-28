import type { MediaRecord, NewRecordInput, PostReadMemo } from '../types/record';
import { HINTS, pickHints } from './hints';
import { recordToInput } from './notes';

/**
 * 読後メモを書く画面の下書き。
 * - oneLiner: 「この本をひとことで」の欄
 * - text: 「読後メモ」の入力欄（1 つ）
 * - hints: 出ているヒント（3 つ）。開き直したときに同じ顔ぶれで出す
 * - usedHints: 入れたヒント（✓ を付ける）。保存した読後メモには残さない
 */
export type WriteDraft = {
  oneLiner: string;
  text: string;
  hints: string[];
  usedHints: string[];
};

const defaultGenerateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const defaultNow = () => new Date().toISOString();

/**
 * ヒントを文章の最後に入れる。文章が空ならそのまま、空でなければ一段改行してから入れる
 * （すでに改行で終わっていれば改行を足さない）。
 */
export function appendHint(text: string, hint: string): string {
  if (text === '' || text.endsWith('\n')) return `${text}${hint}`;
  return `${text}\n${hint}`;
}

const ALL_HINTS = new Set(Object.values(HINTS).flat());
const HINT_COUNT = 3;

/** 下書きに残っていたヒントが 3 つとも今の一覧にあればそれを、なければ選び直す。 */
export function restoreHints(saved: readonly string[], rating: number | null, random: () => number = Math.random): string[] {
  if (saved.length === HINT_COUNT && saved.every((hint) => ALL_HINTS.has(hint))) return [...saved];
  return pickHints(rating, random);
}

/** 開いたときから何も変えていなければ true（下書きを残さない・保存しない）。 */
export function isUnchanged(record: Pick<MediaRecord, 'oneLiner'>, values: Pick<WriteDraft, 'oneLiner' | 'text'>): boolean {
  return values.text.trim() === '' && values.oneLiner.trim() === (record.oneLiner ?? '').trim();
}

export type WriteOptions = { now?: () => string; generateId?: () => string };

/** ひとことを保存し（空なら null）、読後メモの欄が空でなければ読後メモを 1 件足す。 */
export function buildWriteInput(
  record: MediaRecord,
  values: Pick<WriteDraft, 'oneLiner' | 'text'>,
  options: WriteOptions = {},
): NewRecordInput {
  const now = options.now ?? defaultNow;
  const generateId = options.generateId ?? defaultGenerateId;
  const text = values.text.trim();
  const added: PostReadMemo[] = text === '' ? [] : [{ id: generateId(), text, createdAt: now() }];
  const oneLiner = values.oneLiner.trim();
  return {
    ...recordToInput(record, record.memos, record.quotes),
    oneLiner: oneLiner === '' ? null : oneLiner,
    postReadMemos: [...record.postReadMemos, ...added],
  };
}
