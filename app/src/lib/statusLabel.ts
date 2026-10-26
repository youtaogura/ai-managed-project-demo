import type { MediaKind, RecordStatus } from '../types/record';

export const KIND_LABELS: Record<MediaKind, string> = {
  book: '本',
  manga: '漫画',
  movie: '映画',
  drama: 'ドラマ',
  anime: 'アニメ',
};

const READ_LABELS: Record<RecordStatus, string> = {
  planned: '読みたい',
  in_progress: '読んでる',
  dropped: '途中でやめた',
  completed: '読み終わった',
};

const WATCH_LABELS: Record<RecordStatus, string> = {
  planned: '見たい',
  in_progress: '見てる',
  dropped: '途中でやめた',
  completed: '見終わった',
};

export function getStatusLabel(kind: MediaKind, status: RecordStatus): string {
  const isReading = kind === 'book' || kind === 'manga';
  return (isReading ? READ_LABELS : WATCH_LABELS)[status];
}
