import { defaultFetch, type CoverProvider, type FetchFn } from './CoverProvider';

const THUMBNAIL_BASE = 'https://ndlsearch.ndl.go.jp/thumbnail';

/** 国立国会図書館サーチの書影 API。画像がなければ 404 になるので HEAD で確認する。 */
export class NdlCoverProvider implements CoverProvider {
  readonly name = 'ndl';
  private readonly fetchFn: FetchFn;

  constructor(options: { fetchFn?: FetchFn } = {}) {
    this.fetchFn = options.fetchFn ?? defaultFetch();
  }

  async findCoverUrl(isbn13: string, signal: AbortSignal): Promise<string | null> {
    const url = `${THUMBNAIL_BASE}/${isbn13}.jpg`;
    try {
      const response = await this.fetchFn(url, { method: 'HEAD', signal });
      return response.status === 200 ? url : null;
    } catch {
      return null;
    }
  }
}
