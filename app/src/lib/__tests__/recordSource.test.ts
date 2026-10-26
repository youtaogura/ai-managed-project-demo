import { makeRecord } from '../../testUtils';
import type { RecordSource } from '../../types/record';
import {
  isRecordSource,
  isSameWork,
  paramsToSource,
  sourceFromIsbn,
  sourceKey,
  sourceToParams,
} from '../recordSource';

const tmdbMovie = { provider: 'tmdb', mediaType: 'movie', tmdbId: '1' };

describe('isRecordSource', () => {
  it.each<unknown>([
    { provider: 'manual' },
    { provider: 'openbd', isbn: '9784065199817' },
    { provider: 'ndl', ndlId: '1' },
  ])('%o は有効', (value) => {
    expect(isRecordSource(value)).toBe(true);
  });

  it.each<unknown>([
    null,
    'x',
    [],
    {},
    { provider: 'unknown' },
    { provider: 'openbd', isbn: '' },
    { provider: 'openbd', isbn: '  ' },
    { provider: 'openbd' },
    { provider: 'ndl', ndlId: ' ' },
    tmdbMovie,
  ])('%o は無効', (value) => {
    expect(isRecordSource(value)).toBe(false);
  });
});

describe('sourceKey', () => {
  it('取得元ごとに一意。manual は null', () => {
    expect(sourceKey({ provider: 'manual' })).toBeNull();
    expect(sourceKey({ provider: 'openbd', isbn: 'i' })).toBe('openbd:i');
    expect(sourceKey({ provider: 'ndl', ndlId: 'n' })).toBe('ndl:n');
  });
});

describe('isSameWork', () => {
  const rec = (source: RecordSource, isbn: string | null = null) => makeRecord({ source, isbn });
  it('sourceKey が等しければ true', () => {
    const ndl: RecordSource = { provider: 'ndl', ndlId: '1' };
    expect(isSameWork(rec(ndl), rec(ndl))).toBe(true);
    expect(isSameWork(rec(ndl), rec({ provider: 'ndl', ndlId: '2' }))).toBe(false);
  });
  it('ISBN が等しければ取得元が違っても true', () => {
    expect(isSameWork(rec({ provider: 'ndl', ndlId: '1' }, 'x'), rec({ provider: 'manual' }, 'x'))).toBe(true);
  });
  it('manual 同士で ISBN なしは false', () => {
    expect(isSameWork(rec({ provider: 'manual' }), rec({ provider: 'manual' }))).toBe(false);
  });
});

describe('sourceFromIsbn', () => {
  it('非空なら openbd、それ以外は manual', () => {
    expect(sourceFromIsbn('1')).toEqual({ provider: 'openbd', isbn: '1' });
    expect(sourceFromIsbn('')).toEqual({ provider: 'manual' });
    expect(sourceFromIsbn(null)).toEqual({ provider: 'manual' });
    expect(sourceFromIsbn(undefined)).toEqual({ provider: 'manual' });
  });
});

describe('params 変換', () => {
  it.each<RecordSource>([
    { provider: 'openbd', isbn: '1' },
    { provider: 'ndl', ndlId: '2' },
  ])('%o は往復できる', (source) => {
    expect(paramsToSource(sourceToParams(source))).toEqual(source);
  });

  it('manual は空、不正な組み合わせは manual', () => {
    expect(sourceToParams({ provider: 'manual' })).toEqual({});
    const manual = { provider: 'manual' };
    expect(paramsToSource({})).toEqual(manual);
    expect(paramsToSource({ sourceProvider: 'openbd', sourceId: '' })).toEqual(manual);
    expect(paramsToSource({ sourceProvider: 'tmdb', sourceType: 'movie', sourceId: '1' })).toEqual(manual);
    expect(paramsToSource({ sourceProvider: 'bogus', sourceId: '1' })).toEqual(manual);
    expect(paramsToSource({ sourceProvider: ['openbd'], sourceId: '1' })).toEqual(manual);
  });
});
