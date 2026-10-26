import type { MediaRecord } from '../types/record';
import { formatDateTime } from './format';

export type InfoRow = { label: string; value: string };

export function buildInfoRows(record: MediaRecord): InfoRow[] {
  const rows: (InfoRow | null)[] = [
    record.creator ? { label: '作者・著者', value: record.creator } : null,
    record.publisher ? { label: '出版社', value: record.publisher } : null,
    record.isbn ? { label: 'ISBN', value: record.isbn } : null,
    { label: '登録日時', value: formatDateTime(record.createdAt) },
    { label: '更新日時', value: formatDateTime(record.updatedAt) },
  ];
  return rows.filter((r): r is InfoRow => r !== null);
}
