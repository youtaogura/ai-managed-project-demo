import type { BookSearchResult } from '../../../types/bookSearch';
import type { BookSearchProvider } from '../BookSearchProvider';
import { parseNdlResponse } from './parseNdlResponse';

const ENDPOINT = 'https://ndlsearch.ndl.go.jp/api/opensearch';
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_COUNT = 50;
const DPID_NDL_OPAC = 'iss-ndl-opac';

type FetchFn = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export class NdlSearchProvider implements BookSearchProvider {
  readonly attribution = '国立国会図書館サーチ API を利用しています';
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;

  constructor(options: { fetchFn?: FetchFn; timeoutMs?: number } = {}) {
    this.fetchFn = options.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async search(keyword: string): Promise<BookSearchResult> {
    const url = `${ENDPOINT}?title=${encodeURIComponent(keyword.trim())}&cnt=${MAX_COUNT}&dpid=${DPID_NDL_OPAC}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let body: string;
    try {
      const response = await this.fetchFn(url, { signal: controller.signal });
      if (!response.ok) return { status: 'error', reason: 'network' };
      body = await response.text();
    } catch {
      return { status: 'error', reason: 'network' };
    } finally {
      clearTimeout(timer);
    }
    try {
      return { status: 'ok', candidates: parseNdlResponse(body) };
    } catch {
      return { status: 'error', reason: 'invalid_response' };
    }
  }
}
