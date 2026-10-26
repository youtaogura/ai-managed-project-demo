import { MEDIA_KINDS, RECORD_STATUSES, type MediaKind, type RecordStatus } from '../../types/record';
import {
  KIND_LABELS,
  getCreatorLabel,
  getDateHint,
  getDateLabels,
  getStatusLabel,
} from '../statusLabel';

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

describe('日付・作者欄の見出し', () => {
  it('本・漫画は「読」、それ以外は「見」', () => {
    expect(getDateLabels('book')).toEqual({ start: '読み始めた日', end: '読み終えた日' });
    expect(getDateLabels('manga')).toEqual({ start: '読み始めた日', end: '読み終えた日' });
    expect(getDateLabels('movie')).toEqual({ start: '見始めた日', end: '見終えた日' });
    expect(getDateLabels('anime')).toEqual({ start: '見始めた日', end: '見終えた日' });
  });

  it('作者欄の見出し', () => {
    expect(getCreatorLabel('book')).toBe('作者・著者');
    expect(getCreatorLabel('drama')).toBe('監督など');
  });

  it('日付のヒント', () => {
    expect(getDateHint('manga')).toBe('「読み終わった」を選ぶと、終えた日に今日が入ります');
    expect(getDateHint('movie')).toBe('「見終わった」を選ぶと、終えた日に今日が入ります');
  });
});
