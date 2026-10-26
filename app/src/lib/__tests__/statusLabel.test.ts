import { MEDIA_KINDS, RECORD_STATUSES, type MediaKind, type RecordStatus } from '../../types/record';
import { KIND_LABELS, getStatusLabel } from '../statusLabel';

const READ = ['読みたい', '読んでる', '途中でやめた', '読み終わった'];
const WATCH = ['見たい', '見てる', '途中でやめた', '見終わった'];

const cases: [MediaKind, RecordStatus, string][] = MEDIA_KINDS.flatMap((kind) =>
  RECORD_STATUSES.map((status, i): [MediaKind, RecordStatus, string] => [
    kind,
    status,
    (kind === 'book' || kind === 'manga' ? READ : WATCH)[i] ?? '',
  ]),
);

describe('getStatusLabel', () => {
  it('20 通りを網羅している', () => {
    expect(cases).toHaveLength(20);
  });

  it.each(cases)('%s / %s → %s', (kind, status, label) => {
    expect(getStatusLabel(kind, status)).toBe(label);
  });
});

describe('KIND_LABELS', () => {
  it('種別の日本語名を返す', () => {
    expect(KIND_LABELS).toEqual({
      book: '本',
      manga: '漫画',
      movie: '映画',
      drama: 'ドラマ',
      anime: 'アニメ',
    });
  });
});
