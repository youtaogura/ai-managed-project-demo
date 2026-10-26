import type { MemoEntry, MediaRecord, NewRecordInput, QuoteEntry } from '../types/record';

export type NoteKind = 'memo' | 'quote';

export type NoteItem = { kind: 'memo'; entry: MemoEntry } | { kind: 'quote'; entry: QuoteEntry };

export type NoteDraft = { kind: NoteKind; page: string; text: string; comment: string };

export type NoteInput = NoteDraft;

export const PAGE_MAX_LENGTH = 10;

const defaultNow = () => new Date().toISOString();
const defaultGenerateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type NoteOptions = { now?: () => string; generateId?: () => string };

/** ページの先頭の数字。読み取れなければ null。 */
function pageNumber(page: string | null): number | null {
  const match = /\d+/.exec(page ?? '');
  return match ? Number(match[0]) : null;
}

export function buildNoteItems(record: Pick<MediaRecord, 'memos' | 'quotes'>): NoteItem[] {
  const items: NoteItem[] = [
    ...record.memos.map((entry): NoteItem => ({ kind: 'memo', entry })),
    ...record.quotes.map((entry): NoteItem => ({ kind: 'quote', entry })),
  ];
  return items
    .map((item, index) => ({ item, index, page: pageNumber(item.entry.page) }))
    .sort((a, b) => {
      if (a.page !== null && b.page !== null && a.page !== b.page) return a.page - b.page;
      if ((a.page === null) !== (b.page === null)) return a.page === null ? 1 : -1;
      if (a.item.entry.createdAt !== b.item.entry.createdAt) {
        return a.item.entry.createdAt < b.item.entry.createdAt ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function normalizePage(input: string): string | null {
  const trimmed = input.trim().slice(0, PAGE_MAX_LENGTH).trim();
  return trimmed === '' ? null : trimmed;
}

export function isNoteSubmittable(draft: Pick<NoteDraft, 'text'>): boolean {
  return draft.text.trim() !== '';
}

export function isDraftEmpty(draft: NoteDraft): boolean {
  return draft.page === '' && draft.text === '' && draft.comment === '';
}

export function recordToInput(record: MediaRecord, memos: MemoEntry[], quotes: QuoteEntry[]): NewRecordInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, spineColor: _spineColor, ...input } = record;
  return { ...input, memos, quotes };
}

function buildEntry(input: NoteInput, id: string, createdAt: string): NoteItem | null {
  const text = input.text.trim();
  if (text === '') return null;
  const page = normalizePage(input.page);
  if (input.kind === 'memo') return { kind: 'memo', entry: { id, text, page, createdAt } };
  const comment = input.comment.trim();
  return { kind: 'quote', entry: { id, text, page, comment: comment === '' ? null : comment, createdAt } };
}

function place(record: MediaRecord, item: NoteItem): NewRecordInput {
  return item.kind === 'memo'
    ? recordToInput(record, [...record.memos, item.entry], record.quotes)
    : recordToInput(record, record.memos, [...record.quotes, item.entry]);
}

/** 本文が空なら null。 */
export function addNote(record: MediaRecord, input: NoteInput, options: NoteOptions = {}): NewRecordInput | null {
  const item = buildEntry(input, (options.generateId ?? defaultGenerateId)(), (options.now ?? defaultNow)());
  return item ? place(record, item) : null;
}

/** 対象が無い・本文が空なら null。種類を変えると元を消して追加する（id と createdAt は引き継ぐ）。 */
export function updateNote(
  record: MediaRecord,
  target: { kind: NoteKind; id: string },
  input: NoteInput,
): NewRecordInput | null {
  const original = (target.kind === 'memo' ? record.memos : record.quotes).find((e) => e.id === target.id);
  if (!original) return null;
  const item = buildEntry(input, original.id, original.createdAt);
  if (!item) return null;
  if (item.kind === target.kind) {
    return item.kind === 'memo'
      ? recordToInput(record, record.memos.map((e) => (e.id === original.id ? item.entry : e)), record.quotes)
      : recordToInput(record, record.memos, record.quotes.map((e) => (e.id === original.id ? item.entry : e)));
  }
  return place(removeEntry(record, target), item);
}

function removeEntry(record: MediaRecord, target: { kind: NoteKind; id: string }): MediaRecord {
  return {
    ...record,
    memos: target.kind === 'memo' ? record.memos.filter((e) => e.id !== target.id) : record.memos,
    quotes: target.kind === 'quote' ? record.quotes.filter((e) => e.id !== target.id) : record.quotes,
  };
}

export function removeNote(record: MediaRecord, target: { kind: NoteKind; id: string }): NewRecordInput {
  const next = removeEntry(record, target);
  return recordToInput(record, next.memos, next.quotes);
}

/** 表示用のページ。数字で始まるときだけ「p.」を付ける（「あとがき」などはそのまま）。 */
export function formatPage(page: string): string {
  const bare = page.replace(/^p\.?\s*/i, '');
  return /^\d/.test(bare) ? `p.${bare}` : page;
}
