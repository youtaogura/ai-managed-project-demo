import type { MediaKind } from '../types/record';

export function infoCellLabels(kind: MediaKind): { start: string; end: string } {
  switch (kind) {
    case 'book':
    case 'manga':
      return { start: '読み始めた', end: '読み終えた' };
    case 'movie':
    case 'drama':
    case 'anime':
      return { start: '見始めた', end: '見終えた' };
  }
}
