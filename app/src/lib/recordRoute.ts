import type { MediaRecord } from '../types/record';

// 本を開く遷移先。読んでる本は「読んでる本」、それ以外は「読み返す」
export function recordHref(record: Pick<MediaRecord, 'id' | 'status'>): `/reading/${string}` | `/records/${string}` {
  return record.status === 'in_progress' ? `/reading/${record.id}` : `/records/${record.id}`;
}
