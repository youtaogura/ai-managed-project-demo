import { createDefaultBookLookupProvider } from '..';
import { OpenBdProvider } from '../OpenBdProvider';

const ISBN = '9784065199817';

function respond(body: unknown, ok = true) {
  return jest.fn(async (_url: string, _init?: { signal?: AbortSignal }) => ({
    ok,
    json: async () => body,
  }));
}

describe('OpenBdProvider', () => {
  it('URL を GET し summary を BookInfo に変換する', async () => {
    const fetchFn = respond([
      { summary: { title: 'T', author: 'A', publisher: 'P', isbn: ISBN, cover: 'C' } },
    ]);
    const result = await new OpenBdProvider(fetchFn).lookupByIsbn(ISBN);
    expect(fetchFn.mock.calls[0][0]).toBe(`https://api.openbd.jp/v1/get?isbn=${ISBN}`);
    expect(result).toEqual({
      status: 'found',
      book: { isbn: ISBN, title: 'T', author: 'A', publisher: 'P', coverUrl: 'C' },
    });
  });

  it('空の項目は null、isbn は問い合わせ値で補う', async () => {
    const fetchFn = respond([{ summary: { title: 'T', author: '', isbn: '' } }]);
    expect(await new OpenBdProvider(fetchFn).lookupByIsbn(ISBN)).toEqual({
      status: 'found',
      book: { isbn: ISBN, title: 'T', author: null, publisher: null, coverUrl: null },
    });
  });

  it('[null] や空配列は not_found', async () => {
    expect(await new OpenBdProvider(respond([null])).lookupByIsbn(ISBN)).toEqual({
      status: 'not_found',
    });
    expect(await new OpenBdProvider(respond([])).lookupByIsbn(ISBN)).toEqual({
      status: 'not_found',
    });
  });

  it('HTTP エラー・想定外の形・reject は error', async () => {
    expect(await new OpenBdProvider(respond([], false)).lookupByIsbn(ISBN)).toEqual({
      status: 'error',
    });
    for (const body of [{}, ['x'], [{}], [{ summary: { title: 1 } }]]) {
      expect(await new OpenBdProvider(respond(body)).lookupByIsbn(ISBN)).toEqual({
        status: 'error',
      });
    }
    const failing = jest.fn(async () => {
      throw new Error('network');
    });
    expect(await new OpenBdProvider(failing).lookupByIsbn(ISBN)).toEqual({ status: 'error' });
  });

  it('タイムアウトで error', async () => {
    jest.useFakeTimers();
    const hanging = (_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const pending = new OpenBdProvider(hanging, 1000).lookupByIsbn(ISBN);
    await jest.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ status: 'error' });
    jest.useRealTimers();
  });

  it('既定の Provider を作れる', () => {
    expect(createDefaultBookLookupProvider()).toBeInstanceOf(OpenBdProvider);
  });
});
