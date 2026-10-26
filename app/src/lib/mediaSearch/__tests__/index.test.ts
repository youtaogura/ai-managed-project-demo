import { createDefaultMediaSearchProvider } from '..';
import { TmdbSearchProvider } from '../tmdb/TmdbSearchProvider';

describe('createDefaultMediaSearchProvider', () => {
  it.each([undefined, '', '   '])('キーが %p なら null', (key) => {
    expect(createDefaultMediaSearchProvider(key)).toBeNull();
  });

  it('キーがあれば TmdbSearchProvider', () => {
    expect(createDefaultMediaSearchProvider('abc')).toBeInstanceOf(TmdbSearchProvider);
  });
});
