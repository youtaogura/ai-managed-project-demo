import { makeRecord } from '../../../testUtils';
import { needsCover } from '../needsCover';
import { withCover } from '../withCover';

describe('needsCover', () => {
  const base = { isbn: '9784065199817', coverUrl: null, photoUri: null };
  it('ISBN があり写真も書影もなければ true', () => {
    expect(needsCover(base)).toBe(true);
  });
  it.each([
    { isbn: null },
    { coverUrl: 'https://c' },
    { photoUri: 'file://p' },
  ])('%j では false', (override) => {
    expect(needsCover({ ...base, ...override })).toBe(false);
  });
  it('MediaRecord も受け取れる', () => {
    expect(needsCover(makeRecord({ isbn: null }))).toBe(false);
  });
});

describe('withCover', () => {
  const book = { isbn: '9784065199817', title: 'T', author: null, publisher: null, coverUrl: null };
  it('書影があれば取得しない', async () => {
    const resolver = jest.fn(async () => 'https://x');
    const withUrl = { ...book, coverUrl: 'https://o' };
    expect(await withCover(withUrl, resolver)).toBe(withUrl);
    expect(resolver).not.toHaveBeenCalled();
  });
  it('取得できれば補う', async () => {
    expect((await withCover(book, async () => 'https://x')).coverUrl).toBe('https://x');
  });
  it('null・例外では元のまま', async () => {
    expect(await withCover(book, async () => null)).toBe(book);
    expect(
      await withCover(book, async () => {
        throw new Error('x');
      }),
    ).toBe(book);
  });
});
