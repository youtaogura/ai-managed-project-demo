import { makeRecord } from '../../testUtils';
import {
  addEntries,
  filterRecordsByKinds,
  firstMediaKind,
  formKindOptions,
  resolveInitialKind,
  toggleKind,
} from '../enabledKinds';

describe('toggleKind', () => {
  it('外す・足す。結果は MEDIA_KINDS 順', () => {
    expect(toggleKind(['book', 'manga', 'anime'], 'manga')).toEqual(['book', 'anime']);
    expect(toggleKind(['anime', 'book'], 'movie')).toEqual(['book', 'movie', 'anime']);
  });

  it('最後の 1 つは外せない', () => {
    const enabled = ['movie' as const];
    expect(toggleKind(enabled, 'movie')).toEqual(['movie']);
  });
});

describe('filterRecordsByKinds', () => {
  it('使う種別の記録だけを返し、元の配列は変えない', () => {
    const records = [makeRecord({ id: '1', kind: 'book' }), makeRecord({ id: '2', kind: 'movie' })];
    expect(filterRecordsByKinds(records, ['movie']).map((r) => r.id)).toEqual(['2']);
    expect(records).toHaveLength(2);
  });
});

describe('resolveInitialKind', () => {
  it('使う種別ならそのまま', () => {
    expect(resolveInitialKind('movie', ['book', 'movie'])).toBe('movie');
  });
  it('未指定は book を要求したものとして扱う', () => {
    expect(resolveInitialKind(undefined, ['book', 'movie'])).toBe('book');
    expect(resolveInitialKind(undefined, ['manga', 'movie'])).toBe('manga');
  });
  it('同じ系統の使う種別の先頭に置き換える', () => {
    expect(resolveInitialKind('book', ['movie', 'manga'])).toBe('manga');
    expect(resolveInitialKind('movie', ['book', 'anime', 'drama'])).toBe('drama');
  });
  it('同じ系統がなければ使う種別の先頭', () => {
    expect(resolveInitialKind('book', ['drama', 'anime'])).toBe('drama');
    expect(resolveInitialKind('anime', ['manga'])).toBe('manga');
  });
});

describe('formKindOptions', () => {
  it('使う種別 ∪ 元の種別（MEDIA_KINDS 順）', () => {
    expect(formKindOptions(['movie'])).toEqual(['movie']);
    expect(formKindOptions(['movie'], 'book')).toEqual(['book', 'movie']);
    expect(formKindOptions(['book', 'movie'], 'movie')).toEqual(['book', 'movie']);
  });
});

describe('firstMediaKind', () => {
  it('movie drama anime の順で使う先頭', () => {
    expect(firstMediaKind(['book', 'anime', 'drama'])).toBe('drama');
    expect(firstMediaKind(['book', 'manga'])).toBeUndefined();
  });
});

describe('addEntries', () => {
  it('すべて使うとき', () => {
    expect(addEntries(['book', 'movie'], true)).toEqual([
      'scan',
      'search',
      'isbn',
      'manual',
      'mediaSearch',
      'mediaManual',
    ]);
    expect(addEntries(['book', 'movie'], false)).not.toContain('mediaSearch');
  });
  it('本・漫画だけ／映画等だけ', () => {
    expect(addEntries(['manga'], true)).toEqual(['scan', 'search', 'isbn', 'manual']);
    expect(addEntries(['anime'], true)).toEqual(['mediaSearch', 'mediaManual']);
    expect(addEntries(['anime'], false)).toEqual(['mediaManual']);
  });
});
