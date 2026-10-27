import { createDefaultBookLookupProvider } from '..';
import { OpenBdProvider } from '../OpenBdProvider';

const ISBN = '9784065199817';

function respond(body: unknown, ok = true) {
  return jest.fn(async (_url: string, _init?: unknown) => ({ ok, json: async () => body }) as Response);
}

const summary = {
  isbn: ISBN,
  title: 'タイトル',
  author: '著者',
  publisher: '出版社',
  cover: 'https://example.com/c.jpg',
};

describe('OpenBdProvider', () => {
  it('ISBN-13 で GET し、summary を BookInfo に変換する', async () => {
    const fetchFn = respond([{ summary }]);
    const result = await new OpenBdProvider({ fetchFn }).lookupByIsbn(ISBN);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(`https://api.openbd.jp/v1/get?isbn=${ISBN}`);
    expect(result).toEqual({
      status: 'found',
      book: {
        isbn: ISBN,
        title: 'タイトル',
        author: '著者',
        publisher: '出版社',
        coverUrl: 'https://example.com/c.jpg',
      },
    });
  });

  it('空・欠落の項目は null、summary.isbn が空なら問い合わせた ISBN を使う', async () => {
    const fetchFn = respond([{ summary: { title: 'T', isbn: '', author: '', cover: '' } }]);
    const result = await new OpenBdProvider({ fetchFn }).lookupByIsbn(ISBN);
    expect(result).toEqual({
      status: 'found',
      book: { isbn: ISBN, title: 'T', author: null, publisher: null, coverUrl: null },
    });
  });

  it('[null] と空配列は not_found', async () => {
    expect(await new OpenBdProvider({ fetchFn: respond([null]) }).lookupByIsbn(ISBN)).toEqual({
      status: 'not_found',
    });
    expect(await new OpenBdProvider({ fetchFn: respond([]) }).lookupByIsbn(ISBN)).toEqual({
      status: 'not_found',
    });
  });

  it.each([
    ['HTTP エラー', respond([{ summary }], false)],
    ['配列でない', respond({})],
    ['summary がない', respond([{}])],
    ['entry が文字列', respond(['x'])],
    ['title が文字列でない', respond([{ summary: { title: 1 } }])],
    ['title が空', respond([{ summary: { title: ' ' } }])],
    [
      'JSON 不正',
      jest.fn(async (_url: string) => ({ ok: true, json: async () => JSON.parse('{') }) as Response),
    ],
    ['reject', jest.fn(async (_url: string) => Promise.reject(new Error('net')))],
  ])('%s は error を返す', async (_name, fetchFn) => {
    expect(await new OpenBdProvider({ fetchFn }).lookupByIsbn(ISBN)).toEqual({ status: 'error' });
  });

  it('タイムアウトで error を返す', async () => {
    jest.useFakeTimers();
    try {
      const fetchFn = jest.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const promise = new OpenBdProvider({ fetchFn, timeoutMs: 10000 }).lookupByIsbn(ISBN);
      await jest.advanceTimersByTimeAsync(10000);
      expect(await promise).toEqual({ status: 'error' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('既定の fetch を使う', async () => {
    const original = globalThis.fetch;
    const mock = respond([null]);
    globalThis.fetch = (input, init) => mock(String(input), init);
    try {
      expect(await new OpenBdProvider().lookupByIsbn(ISBN)).toEqual({ status: 'not_found' });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('既定の Provider を作れる', () => {
    expect(createDefaultBookLookupProvider()).toBeInstanceOf(OpenBdProvider);
  });
});

describe('OpenBdProvider の作者の整形', () => {
  it('役割つきの作者を整形してつなぐ', async () => {
    const fetchFn = respond([{ summary: { ...summary, author: '村上春樹／著 〇〇／訳' } }]);
    const result = await new OpenBdProvider({ fetchFn }).lookupByIsbn(ISBN);
    expect(result).toMatchObject({ status: 'found', book: { author: '村上春樹、〇〇' } });
  });
});
