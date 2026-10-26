import { infoCellLabels } from '../infoCellLabels';

describe('infoCellLabels', () => {
  it('読書の文言を返す', () => {
    expect(infoCellLabels()).toEqual({ start: '読み始めた', end: '読み終えた' });
  });
});
