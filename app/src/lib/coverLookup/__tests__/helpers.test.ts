import { makeRecord } from '../../../testUtils';
import { coverCreditLabel } from '../coverCredit';
import { needsCover } from '../needsCover';
import { withCover } from '../withCover';

describe('coverCreditLabel', () => {
  it.each([
    ['https://books.google.com/books/content?id=1', '書影: Google Books'],
    ['https://lh3.googleusercontent.com/x', '書影: Google Books'],
    ['https://ndlsearch.ndl.go.jp/thumbnail/9784065199817.jpg', '書影: 国立国会図書館サーチ'],
    ['https://cover.openbd.jp/9784065199817.jpg', null],
    [null, null],
  ])('%s → %s', (url, label) => {
    expect(coverCreditLabel(url)).toBe(label);
  });
});

describe('needsCover', () => {
  const base = { kind: 'book' as const, isbn: '9784065199817', coverUrl: null, photoUri: null };
  it('本・漫画で ISBN があり写真も書影もなければ true', () => {
    expect(needsCover(base)).toBe(true);
    expect(needsCover({ ...base, kind: 'manga' })).toBe(true);
  });
  it.each([
    { kind: 'movie' as const },
    { kind: 'anime' as const },
    { isbn: null },
    { coverUrl: 'https://c' },
    { photoUri: 'file://p' },
  ])('%j では false', (override) => {
    expect(needsCover({ ...base, ...override })).toBe(false);
  });
  it('MediaRecord も受け取れる', () => {
    expect(needsCover(makeRecord({ kind: 'book', isbn: null }))).toBe(false);
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
