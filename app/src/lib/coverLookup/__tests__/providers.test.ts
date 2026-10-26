import type { BookLookupResult } from '../../../types/book';
import type { BookLookupProvider } from '../../bookLookup/BookLookupProvider';
import { createDefaultCoverResolver } from '../index';
import { OpenBdCoverProvider } from '../OpenBdCoverProvider';

const ISBN = '9784065199817';
const signal = new AbortController().signal;
const book = (coverUrl: string | null) => ({ isbn: ISBN, title: 'T', author: null, publisher: null, coverUrl });
const find = (result: BookLookupResult | Error) =>
  new OpenBdCoverProvider({
    lookup: {
      lookupByIsbn: async () => {
        if (result instanceof Error) throw result;
        return result;
      },
    },
  }).findCoverUrl(ISBN, signal);

describe('OpenBdCoverProvider', () => {
  it('書影 URL を返す', async () => {
    expect(await find({ status: 'found', book: book('https://cover.openbd.jp/x.jpg') })).toBe(
      'https://cover.openbd.jp/x.jpg',
    );
  });

  it('http:// は https:// にする', async () => {
    expect(await find({ status: 'found', book: book('http://cover.openbd.jp/x.jpg') })).toBe(
      'https://cover.openbd.jp/x.jpg',
    );
  });

  it.each([
    ['書影なし', { status: 'found', book: book(null) } as BookLookupResult],
    ['not_found', { status: 'not_found' } as BookLookupResult],
    ['error', { status: 'error' } as BookLookupResult],
    ['例外', new Error('x')],
  ])('%s は null', async (_name, result) => {
    expect(await find(result)).toBeNull();
  });

  it('中断済みなら問い合わせず null', async () => {
    const lookupByIsbn = jest.fn();
    const lookup = { lookupByIsbn } as unknown as BookLookupProvider;
    const controller = new AbortController();
    controller.abort();
    expect(await new OpenBdCoverProvider({ lookup }).findCoverUrl(ISBN, controller.signal)).toBeNull();
    expect(lookupByIsbn).not.toHaveBeenCalled();
  });

  it('lookup を省略しても作れる', () => {
    expect(new OpenBdCoverProvider().name).toBe('openbd');
  });
});

describe('createDefaultCoverResolver', () => {
  afterEach(() => jest.restoreAllMocks());

  it('openBD にだけ問い合わせる', async () => {
    const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ summary: { title: 'T', cover: 'https://cover.openbd.jp/x.jpg' } }],
    } as unknown as Response);
    expect(await createDefaultCoverResolver()(ISBN)).toBe('https://cover.openbd.jp/x.jpg');
    expect(spy).toHaveBeenCalled();
    for (const [url] of spy.mock.calls) {
      expect(new URL(String(url)).host).toBe('api.openbd.jp');
    }
  });

  it('書影がなければ null', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [null],
    } as unknown as Response);
    expect(await createDefaultCoverResolver()(ISBN)).toBeNull();
  });
});
