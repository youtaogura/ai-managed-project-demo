import { infoCellLabels } from '../infoCellLabels';

describe('infoCellLabels', () => {
  it('本・漫画は読む', () => {
    expect(infoCellLabels('book')).toEqual({ start: '読み始めた', end: '読み終えた' });
    expect(infoCellLabels('manga')).toEqual({ start: '読み始めた', end: '読み終えた' });
  });
  it('映像は見る', () => {
    for (const k of ['movie', 'drama', 'anime'] as const) {
      expect(infoCellLabels(k)).toEqual({ start: '見始めた', end: '見終えた' });
    }
  });
});
