import type { MediaRecord, RecordStatus } from '../types/record';

type LabelRecord = Pick<MediaRecord, 'title' | 'creator' | 'status' | 'favorite'>;

// 背表紙の読み上げに使う、読書専用のステータスの言葉
const SPINE_STATUS_LABELS: Record<RecordStatus, string> = {
  in_progress: '読んでる',
  completed: '読んだ',
  planned: '読みたい',
  dropped: '途中でやめた',
};

/** 「<タイトル>、<作者>、<ステータス>」。お気に入りなら末尾に「、お気に入り」。 */
export function getSpineAccessibilityLabel(record: LabelRecord): string {
  const parts = [record.title];
  if (record.creator) parts.push(record.creator);
  parts.push(SPINE_STATUS_LABELS[record.status]);
  if (record.favorite) parts.push('お気に入り');
  return parts.join('、');
}
