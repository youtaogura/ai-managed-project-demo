import type { MediaRecord } from '../types/record';
import { formatDateTime } from './format';
import { KIND_LABELS } from './statusLabel';

export type InfoRow = { label: string; value: string };

export function buildInfoRows(record: MediaRecord): InfoRow[] {
  const isBook = record.kind === 'book' || record.kind === 'manga';
  const rows: (InfoRow | null)[] = [
    { label: '種別', value: KIND_LABELS[record.kind] },
    record.creator ? { label: isBook ? '作者・著者' : '監督など', value: record.creator } : null,
    isBook && record.publisher ? { label: '出版社', value: record.publisher } : null,
    isBook && record.isbn ? { label: 'ISBN', value: record.isbn } : null,
    { label: '登録日時', value: formatDateTime(record.createdAt) },
    { label: '更新日時', value: formatDateTime(record.updatedAt) },
  ];
  return rows.filter((r): r is InfoRow => r !== null);
}
