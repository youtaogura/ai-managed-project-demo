import { getThumbnailCandidates, getThumbnailSource, PLACEHOLDER_LABELS } from '../thumbnail';
import { MEDIA_KINDS } from '../../types/record';
import { makeRecord } from '../../testUtils';

describe.each(MEDIA_KINDS)('サムネイル (%s)', (kind) => {
  it('写真があれば写真を優先する', () => {
    const r = makeRecord({ kind, photoUri: 'file://p', coverUrl: 'http://c' });
    expect(getThumbnailSource(r)).toEqual({ kind: 'photo', uri: 'file://p' });
    expect(getThumbnailCandidates(r)).toEqual(['file://p', 'http://c']);
  });

  it('写真がなければ書影', () => {
    const r = makeRecord({ kind, coverUrl: 'http://c' });
    expect(getThumbnailSource(r)).toEqual({ kind: 'cover', uri: 'http://c' });
    expect(getThumbnailCandidates(r)).toEqual(['http://c']);
  });

  it('どちらもなければプレースホルダー', () => {
    const r = makeRecord({ kind });
    expect(getThumbnailSource(r)).toEqual({ kind: 'placeholder', uri: null });
    expect(getThumbnailCandidates(r)).toEqual([]);
    expect(PLACEHOLDER_LABELS[kind]).toBeTruthy();
  });
});
