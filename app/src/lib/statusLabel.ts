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

function isReadingKind(kind: MediaKind): boolean {
  return kind === 'book' || kind === 'manga';
}

export function getDateLabels(kind: MediaKind): { start: string; end: string } {
  return isReadingKind(kind)
    ? { start: '読み始めた日', end: '読み終えた日' }
    : { start: '見始めた日', end: '見終えた日' };
}

export function getCreatorLabel(kind: MediaKind): string {
  return isReadingKind(kind) ? '作者・著者' : '監督など';
}

export function getDateHint(kind: MediaKind): string {
  return `「${getStatusLabel(kind, 'completed')}」を選ぶと、終えた日に今日が入ります`;
}
