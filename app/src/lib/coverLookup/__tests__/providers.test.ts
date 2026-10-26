import { GoogleBooksCoverProvider } from '../GoogleBooksCoverProvider';
import { NdlCoverProvider } from '../NdlCoverProvider';

const ISBN = '9784065199817';
const signal = new AbortController().signal;
const res = (status: number, body?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('bad json');
      return body;
    },
  }) as unknown as Response;

describe('NdlCoverProvider', () => {
  it('HEAD が 200 なら URL を返す', async () => {
    const fetchFn = jest.fn(async () => res(200));
    const url = await new NdlCoverProvider({ fetchFn }).findCoverUrl(ISBN, signal);
    expect(url).toBe(`https://ndlsearch.ndl.go.jp/thumbnail/${ISBN}.jpg`);
    expect(fetchFn).toHaveBeenCalledWith(url, { method: 'HEAD', signal });
  });

  it('404 や通信失敗は null', async () => {
    expect(await new NdlCoverProvider({ fetchFn: async () => res(404) }).findCoverUrl(ISBN, signal)).toBeNull();
    const failing = async (): Promise<Response> => {
      throw new Error('network');
    };
    expect(await new NdlCoverProvider({ fetchFn: failing }).findCoverUrl(ISBN, signal)).toBeNull();
  });

  it('fetchFn 省略時は globalThis.fetch を使う', async () => {
    const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(res(200));
    expect(await new NdlCoverProvider().findCoverUrl(ISBN, signal)).not.toBeNull();
    spy.mockRestore();
  });
});

describe('GoogleBooksCoverProvider', () => {
  const find = (response: Response | Error) =>
    new GoogleBooksCoverProvider({
      fetchFn: async () => {
        if (response instanceof Error) throw response;
        return response;
      },
    }).findCoverUrl(ISBN, signal);
  const withLinks = (imageLinks: unknown) => res(200, { items: [{ volumeInfo: { imageLinks } }] });

  it('thumbnail を https にして返す', async () => {
    expect(await find(withLinks({ thumbnail: 'http://books.google.com/x?id=1&edge=curl' }))).toBe(
      'https://books.google.com/x?id=1&edge=curl',
    );
  });

  it('thumbnail がなければ smallThumbnail', async () => {
    expect(await find(withLinks({ smallThumbnail: 'https://s/x' }))).toBe('https://s/x');
  });

  it('isbn 検索 URL を呼ぶ', async () => {
    const fetchFn = jest.fn(async () => res(200, {}));
    await new GoogleBooksCoverProvider({ fetchFn }).findCoverUrl(ISBN, signal);
    expect(fetchFn).toHaveBeenCalledWith(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${ISBN}&maxResults=1`,
      { signal },
    );
  });

  it.each([
    ['items なし', res(200, {})],
    ['items が空', res(200, { items: [] })],
    ['volumeInfo なし', res(200, { items: [{}] })],
    ['imageLinks なし', res(200, { items: [{ volumeInfo: {} }] })],
    ['画像 URL が空', withLinks({ thumbnail: ' ' })],
    ['不正な JSON', res(200)],
    ['HTTP エラー', res(429, {})],
    ['通信失敗', new Error('network')],
  ])('%s は null', async (_name, response) => {
    expect(await find(response)).toBeNull();
  });

  it('fetchFn 省略時は globalThis.fetch を使う', async () => {
    const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, {}));
    expect(await new GoogleBooksCoverProvider().findCoverUrl(ISBN, signal)).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
