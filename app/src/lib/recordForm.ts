import {
  MEDIA_KINDS,
  type MediaKind,
  type MediaRecord,
  type NewRecordInput,
  type RecordStatus,
} from '../types/record';
import { isValidDateString, isValidRating } from './validation';

export type RecordFormValues = {
  kind: MediaKind;
  title: string;
  creator: string;
  publisher: string;
  isbn: string;
  startDate: string;
  endDate: string;
  status: RecordStatus;
  review: string;
  rating: string;
  coverUrl: string | null;
  photoUri: string | null;
};

export type RecordFormErrors = {
  title?: string;
  startDate?: string;
  endDate?: string;
  rating?: string;
};

export const ERROR_TITLE_REQUIRED = 'タイトルを入力してください';
export const ERROR_DATE_FORMAT = '日付は YYYY-MM-DD の形式で入力してください';
export const ERROR_DATE_ORDER = '終了日は開始日以降にしてください';
export const ERROR_RATING = 'レーティングは 1.0〜5.0 の範囲で、小数第1位まで入力してください';

export function hasPublisherFields(kind: MediaKind): boolean {
  return kind === 'book' || kind === 'manga';
}

export function formatRating(value: number | null): string {
  return value === null ? '' : value.toFixed(1);
}

export function createFormValues(initial: Partial<NewRecordInput> = {}): RecordFormValues {
  return {
    kind: initial.kind ?? 'book',
    title: initial.title ?? '',
    creator: initial.creator ?? '',
    publisher: initial.publisher ?? '',
    isbn: initial.isbn ?? '',
    startDate: initial.startDate ?? '',
    endDate: initial.endDate ?? '',
    status: initial.status ?? 'planned',
    review: initial.review ?? '',
    rating: formatRating(initial.rating ?? null),
    coverUrl: initial.coverUrl ?? null,
    photoUri: initial.photoUri ?? null,
  };
}

export function recordToFormValues(record: MediaRecord): RecordFormValues {
  return createFormValues(record);
}

export function parseRating(text: string): number | null {
  const normalized = text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .trim();
  if (normalized === '') return null;
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function stepRating(text: string, delta: 1 | -1): string {
  const current = parseRating(text);
  if (current === null || Number.isNaN(current)) return delta > 0 ? '3.0' : text;
  const next = Math.round(current * 10 + delta) / 10;
  return formatRating(Math.min(5, Math.max(1, next)));
}

export function todayString(date: Date = new Date()): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function applyStatusChange(
  values: RecordFormValues,
  status: RecordStatus,
  today: string,
): RecordFormValues {
  const next = { ...values, status };
  if (status === 'in_progress' && next.startDate.trim() === '') next.startDate = today;
  if ((status === 'completed' || status === 'dropped') && next.endDate.trim() === '') {
    next.endDate = today;
  }
  return next;
}

export function validateForm(values: RecordFormValues): RecordFormErrors {
  const errors: RecordFormErrors = {};
  if (values.title.trim() === '') errors.title = ERROR_TITLE_REQUIRED;

  const start = values.startDate.trim();
  const end = values.endDate.trim();
  if (start !== '' && !isValidDateString(start)) errors.startDate = ERROR_DATE_FORMAT;
  if (end !== '' && !isValidDateString(end)) errors.endDate = ERROR_DATE_FORMAT;
  if (!errors.startDate && !errors.endDate && start !== '' && end !== '' && end < start) {
    errors.endDate = ERROR_DATE_ORDER;
  }

  if (!isValidRating(parseRating(values.rating))) errors.rating = ERROR_RATING;
  return errors;
}

function emptyToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

export function toNewRecordInput(values: RecordFormValues): NewRecordInput {
  const withPublisher = hasPublisherFields(values.kind);
  const rating = parseRating(values.rating);
  return {
    kind: values.kind,
    title: values.title.trim(),
    creator: emptyToNull(values.creator),
    publisher: withPublisher ? emptyToNull(values.publisher) : null,
    isbn: withPublisher ? emptyToNull(values.isbn) : null,
    coverUrl: values.coverUrl,
    photoUri: values.photoUri,
    startDate: emptyToNull(values.startDate),
    endDate: emptyToNull(values.endDate),
    status: values.status,
    review: emptyToNull(values.review),
    rating: rating === null || Number.isNaN(rating) ? null : rating,
  };
}

function isMediaKind(value: string): value is MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(value);
}

export function paramsToInitialValues(
  params: Record<string, string | string[] | undefined>,
): Partial<NewRecordInput> {
  const text = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === 'string' && value !== '' ? value : undefined;
  };
  const initial: Partial<NewRecordInput> = {};
  const kind = text('kind');
  if (kind !== undefined && isMediaKind(kind)) initial.kind = kind;
  const title = text('title');
  if (title !== undefined) initial.title = title;
  const creator = text('creator');
  if (creator !== undefined) initial.creator = creator;
  const publisher = text('publisher');
  if (publisher !== undefined) initial.publisher = publisher;
  const isbn = text('isbn');
  if (isbn !== undefined) initial.isbn = isbn;
  const coverUrl = text('coverUrl');
  if (coverUrl !== undefined) initial.coverUrl = coverUrl;
  return initial;
}
