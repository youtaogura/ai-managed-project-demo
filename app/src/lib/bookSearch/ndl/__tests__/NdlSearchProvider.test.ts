import { NdlSearchProvider } from '../NdlSearchProvider';

const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>本</title></item></channel></rss>`;

function okFetch(body: string) {
  return jest.fn(async (_url: string | URL | Request) => ({ ok: true, text: async () => body }) as Response);
}

describe('NdlSearchProvider', () => {
  it('URL を組み立てて GET し、候補を返す', async () => {
    const fetchFn = okFetch(xml);
    const result = await new NdlSearchProvider({ fetchFn }).search('  ワン ピース ');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(
      'https://ndlsearch.ndl.go.jp/api/opensearch?title=%E3%83%AF%E3%83%B3%20%E3%83%94%E3%83%BC%E3%82%B9&cnt=100&mediatype=books&dpid=iss-ndl-opac',
    );
    expect(result).toEqual({
      status: 'ok',
      candidates: [{ title: '本', author: null, publisher: null, publishedYear: null, isbn: null, ndlId: null }],
    });
  });

  it('0 件でも ok', async () => {
    const body = '<rss><channel></channel></rss>';
    expect(await new NdlSearchProvider({ fetchFn: okFetch(body) }).search('x')).toEqual({
      status: 'ok',
      candidates: [],
    });
  });

  it('HTTP エラーは network', async () => {
    const fetchFn = jest.fn(async () => ({ ok: false }) as Response);
    expect(await new NdlSearchProvider({ fetchFn }).search('x')).toEqual({
      status: 'error',
      reason: 'network',
    });
  });

  it('429・503 は待ってやり直し、成功すれば候補を返す', async () => {
    const sleep = jest.fn(async () => undefined);
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => xml } as Response);
    const result = await new NdlSearchProvider({ fetchFn, sleep }).search('本');
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
    expect(result.status).toBe('ok');
  });

  it('やり直しても 429 が続けば network', async () => {
    const sleep = jest.fn(async () => undefined);
    const fetchFn = jest.fn(async () => ({ ok: false, status: 429 }) as Response);
    expect(await new NdlSearchProvider({ fetchFn, sleep }).search('x')).toEqual({ status: 'error', reason: 'network' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('429・503 以外の HTTP エラーはやり直さない', async () => {
    const sleep = jest.fn(async () => undefined);
    const fetchFn = jest.fn(async () => ({ ok: false, status: 500 }) as Response);
    expect((await new NdlSearchProvider({ fetchFn, sleep }).search('x')).status).toBe('error');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('既定の待ち時間でやり直す', async () => {
    jest.useFakeTimers();
    try {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => xml } as Response);
      const promise = new NdlSearchProvider({ fetchFn }).search('本');
      await jest.advanceTimersByTimeAsync(1000);
      expect((await promise).status).toBe('ok');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('キーワードと一致するタイトルを先頭に並べる', async () => {
    const item = (title: string, isbn: string) =>
      `<item><title>${title}</title><category>図書</category><dc:identifier xsi:type="dcndl:ISBN">${isbn}</dc:identifier></item>`;
    const body = `<rss xmlns:dc="dc" xmlns:xsi="xsi" xmlns:dcndl="dcndl" version="2.0"><channel>${item('音楽家たちの村上春樹 : ノルウェイの森と10のオマージュ', '9784000000001')}${item('ノルウェイの森', '9784062748681')}</channel></rss>`;
    const result = await new NdlSearchProvider({ fetchFn: okFetch(body) }).search('ノルウェイの森');
    expect(result.status === 'ok' ? result.candidates.map((c) => c.title) : []).toEqual([
      'ノルウェイの森',
      '音楽家たちの村上春樹 : ノルウェイの森と10のオマージュ',
    ]);
  });

  it('fetch の reject は network', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error('offline');
    });
    expect(await new NdlSearchProvider({ fetchFn }).search('x')).toEqual({
      status: 'error',
      reason: 'network',
    });
  });

  it('タイムアウトは network', async () => {
    jest.useFakeTimers();
    try {
      const fetchFn = jest.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const promise = new NdlSearchProvider({ fetchFn }).search('x');
      await jest.advanceTimersByTimeAsync(15000);
      expect(await promise).toEqual({ status: 'error', reason: 'network' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('不正な XML は invalid_response', async () => {
    expect(await new NdlSearchProvider({ fetchFn: okFetch('<html>') }).search('x')).toEqual({
      status: 'error',
      reason: 'invalid_response',
    });
  });

  it('既定の fetch（globalThis.fetch）を使う', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = okFetch(xml);
    try {
      expect((await new NdlSearchProvider().search('x')).status).toBe('ok');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('利用表記を持つ', () => {
    expect(new NdlSearchProvider().attribution).toBe('国立国会図書館サーチ API を利用しています');
  });
});
