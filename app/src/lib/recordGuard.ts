import { MEDIA_KINDS, RECORD_STATUSES, type MediaKind, type MediaRecord, type RecordStatus } from '../types/record';
import { isValidDateRange, isValidRating } from './validation';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function toMediaRecord(value: unknown): MediaRecord | null {
  if (!isObject(value)) return null;
  const { id, kind, title, status, rating, createdAt, updatedAt } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (!isOneOf<MediaKind>(MEDIA_KINDS, kind)) return null;
  if (typeof title !== 'string' || title.trim() === '') return null;
  if (!isOneOf<RecordStatus>(RECORD_STATUSES, status)) return null;
  if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') return null;
  if (!(rating === null || typeof rating === 'number') || !isValidRating(rating)) return null;
  const { creator, publisher, isbn, coverUrl, photoUri, startDate, endDate, review } = value;
  if (
    !isNullableString(creator) ||
    !isNullableString(publisher) ||
    !isNullableString(isbn) ||
    !isNullableString(coverUrl) ||
    !isNullableString(photoUri) ||
    !isNullableString(startDate) ||
    !isNullableString(endDate) ||
    !isNullableString(review)
  ) {
    return null;
  }
  if (!isValidDateRange(startDate, endDate)) return null;
  return {
    id,
    kind,
    title,
    creator,
    publisher,
    isbn,
    coverUrl,
    photoUri,
    startDate,
    endDate,
    status,
    review,
    rating,
    createdAt,
    updatedAt,
  };
}

export function isMediaRecord(value: unknown): value is MediaRecord {
  return toMediaRecord(value) !== null;
}

export function parseRecords(raw: unknown): MediaRecord[] {
  if (!Array.isArray(raw)) return [];
  const records: MediaRecord[] = [];
  for (const item of raw) {
    const record = toMediaRecord(item);
    if (record) records.push(record);
  }
  return records;
}
