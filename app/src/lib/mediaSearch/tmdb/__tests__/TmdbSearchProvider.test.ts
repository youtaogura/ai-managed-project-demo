import { TmdbSearchProvider, TMDB_ATTRIBUTION } from '../TmdbSearchProvider';

type Handler = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>;

const json = (body: unknown, ok = true): Response =>
  ({ ok, text: async () => JSON.stringify(body) }) as Response;

const searchBody = (ids: number[], extra: Record<string, unknown> = {}) => ({
  results: ids.map((id) => ({ id, title: `T${id}`, name: `N${id}`, ...extra })),
});

function make(handler: Handler, apiKey = 'plainkey', timeoutMs?: number) {
  const fetchFn = jest.fn(handler);
  return {
    fetchFn,
    provider: new TmdbSearchProvider({ apiKey, fetchFn, timeoutMs }),
  };
}

describe('TmdbSearchProvider', () => {
  it('表記を持つ', () => {
    expect(new TmdbSearchProvider({ apiKey: 'k' }).attribution).toBe(TMDB_ATTRIBUTION);
  });

  it('映画は /search/movie を ja-JP・include_adult=false で呼び、監督を詳細から取る', async () => {
    const { fetchFn, provider } = make(async (url) => {
      if (url.includes('/search/movie')) return json(searchBody([1]));
      return json({ credits: { crew: [{ job: 'Director', name: '監督' }] } });
    });
    const result = await provider.search(' マトリックス ', 'movie');
    expect(result).toEqual({
      status: 'ok',
      candidates: [expect.objectContaining({ tmdbId: '1', title: 'T1', creator: '監督' })],
    });
    const searchUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(searchUrl.origin + searchUrl.pathname).toBe('https://api.themoviedb.org/3/search/movie');
    expect(searchUrl.searchParams.get('query')).toBe('マトリックス');
    expect(searchUrl.searchParams.get('language')).toBe('ja-JP');
    expect(searchUrl.searchParams.get('include_adult')).toBe('false');
    expect(searchUrl.searchParams.get('api_key')).toBe('plainkey');
    const detail = new URL(fetchFn.mock.calls[1][0]);
    expect(detail.pathname).toBe('/3/movie/1');
    expect(detail.searchParams.get('append_to_response')).toBe('credits');
    expect(detail.searchParams.get('language')).toBe('ja-JP');
  });

  it('ドラマは /search/tv と /tv/{id}（append なし）', async () => {
    const { fetchFn, provider } = make(async (url) => {
      if (url.includes('/search/tv')) return json(searchBody([7]));
      return json({ created_by: [{ name: '制作者' }] });
    });
    const result = await provider.search('x', 'drama');
    expect(result).toEqual({
      status: 'ok',
      candidates: [
        expect.objectContaining({
          mediaType: 'tv',
          title: 'N7',
          creator: '制作者',
        }),
      ],
    });
    expect(fetchFn.mock.calls[0][0]).toContain('/3/search/tv?');
    const detail = new URL(fetchFn.mock.calls[1][0]);
    expect(detail.pathname).toBe('/3/tv/7');
    expect(detail.searchParams.has('append_to_response')).toBe(false);
  });

  it('アニメは movie と tv の両方を呼び、アニメーション優先で並べる', async () => {
    const { fetchFn, provider } = make(async (url) => {
      if (url.includes('/search/movie'))
        return json({ results: [{ id: 1, title: 'M', genre_ids: [] }] });
      if (url.includes('/search/tv'))
        return json({ results: [{ id: 2, name: 'T', genre_ids: [16] }] });
      return json({});
    });
    const result = await provider.search('x', 'anime');
    expect(result.status === 'ok' && result.candidates.map((c) => c.tmdbId)).toEqual(['2', '1']);
    const urls = fetchFn.mock.calls.map((call) => call[0]);
    expect(urls.some((u) => u.includes('/search/movie'))).toBe(true);
    expect(urls.some((u) => u.includes('/search/tv'))).toBe(true);
  });

  it('最大 10 件まで', async () => {
    const { provider } = make(async (url) =>
      url.includes('/search/')
        ? json(searchBody(Array.from({ length: 15 }, (_, i) => i + 1)))
        : json({}),
    );
    const result = await provider.search('x', 'movie');
    expect(result.status === 'ok' && result.candidates).toHaveLength(10);
  });

  it('JWT 形式のキーは Bearer ヘッダで送り、api_key は付けない', async () => {
    const { fetchFn, provider } = make(async () => json({ results: [] }), 'eyJabc.def');
    await provider.search('x', 'movie');
    const [url, init] = fetchFn.mock.calls[0];
    expect(init?.headers?.Authorization).toBe('Bearer eyJabc.def');
    expect(new URL(url).searchParams.has('api_key')).toBe(false);
  });

  it('0 件は ok の空配列', async () => {
    const { provider } = make(async () => json({ results: [] }));
    expect(await provider.search('x', 'movie')).toEqual({
      status: 'ok',
      candidates: [],
    });
  });

  it('詳細の失敗・不正な形・非 JSON は creator null で検索は成功', async () => {
    const { provider } = make(async (url) => {
      if (url.includes('/search/')) return json(searchBody([1, 2, 3, 4]));
      if (url.includes('/movie/1')) throw new Error('boom');
      if (url.includes('/movie/2')) return json({}, false);
      if (url.includes('/movie/3')) return { ok: true, text: async () => 'not json' } as Response;
      return json(['x']);
    });
    const result = await provider.search('x', 'movie');
    expect(result.status === 'ok' && result.candidates.map((c) => c.creator)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it.each([
    [
      'fetch の例外',
      async () => {
        throw new Error('x');
      },
    ],
    ['HTTP エラー（401）', async () => json({}, false)],
  ])('%s は network', async (_name, handler) => {
    const { provider } = make(handler as Handler);
    expect(await provider.search('x', 'movie')).toEqual({
      status: 'error',
      reason: 'network',
    });
  });

  it.each([
    ['results なし', async () => json({})],
    ['JSON 以外', async () => ({ ok: true, text: async () => '<html>' }) as Response],
    ['配列', async () => json([])],
  ])('%s は invalid_response', async (_name, handler) => {
    const { provider } = make(handler as Handler);
    expect(await provider.search('x', 'drama')).toEqual({
      status: 'error',
      reason: 'invalid_response',
    });
  });

  it('タイムアウトは network', async () => {
    const { provider } = make(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      'k',
      20,
    );
    expect(await provider.search('x', 'movie')).toEqual({
      status: 'error',
      reason: 'network',
    });
  });

  it('既定の fetch は globalThis.fetch を使う', async () => {
    const original = globalThis.fetch;
    const spy = jest.fn(async () => json({ results: [] }));
    globalThis.fetch = spy as unknown as typeof fetch;
    try {
      const provider = new TmdbSearchProvider({ apiKey: 'k' });
      expect(await provider.search('x', 'movie')).toEqual({
        status: 'ok',
        candidates: [],
      });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = original;
    }
  });
});
