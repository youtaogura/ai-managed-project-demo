import { getThumbnailCandidates, getThumbnailSource, PLACEHOLDER_LABEL } from '../thumbnail';
import { makeRecord } from '../../testUtils';

describe('サムネイル', () => {
  it('写真があれば写真を優先する', () => {
    const r = makeRecord({ photoUri: 'file://p', coverUrl: 'http://c' });
    expect(getThumbnailSource(r)).toEqual({ kind: 'photo', uri: 'file://p' });
    expect(getThumbnailCandidates(r)).toEqual(['file://p', 'http://c']);
  });

  it('写真がなければ書影', () => {
    const r = makeRecord({ coverUrl: 'http://c' });
    expect(getThumbnailSource(r)).toEqual({ kind: 'cover', uri: 'http://c' });
    expect(getThumbnailCandidates(r)).toEqual(['http://c']);
  });

  it('どちらもなければプレースホルダー（📖）', () => {
    const r = makeRecord();
    expect(getThumbnailSource(r)).toEqual({ kind: 'placeholder', uri: null });
    expect(getThumbnailCandidates(r)).toEqual([]);
    expect(PLACEHOLDER_LABEL).toBe('📖');
  });
});
