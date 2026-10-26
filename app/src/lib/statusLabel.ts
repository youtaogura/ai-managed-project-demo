import type { RecordStatus } from '../types/record';

const STATUS_LABELS: Record<RecordStatus, string> = {
  planned: '読みたい',
  in_progress: '読んでる',
  dropped: '途中でやめた',
  completed: '読み終わった',
};

export function getStatusLabel(status: RecordStatus): string {
  return STATUS_LABELS[status];
}

export function getDateLabels(): { start: string; end: string } {
  return { start: '読み始めた日', end: '読み終えた日' };
}

export function getCreatorLabel(): string {
  return '作者・著者';
}

export function getDateHint(): string {
  return `「${getStatusLabel('completed')}」を選ぶと、終えた日に今日が入ります`;
}
