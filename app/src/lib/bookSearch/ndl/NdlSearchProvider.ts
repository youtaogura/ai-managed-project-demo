import type { BookSearchResult } from '../../../types/bookSearch';
import type { BookSearchProvider } from '../BookSearchProvider';
import { rankCandidates } from '../rankCandidates';
import { parseNdlResponse } from './parseNdlResponse';

const ENDPOINT = 'https://ndlsearch.ndl.go.jp/api/opensearch';
const DEFAULT_TIMEOUT_MS = 15000;
// 結果は読みの順に並ぶので、多めに取って手元で並べ替える
const MAX_COUNT = 100;
const DPID_NDL_OPAC = 'iss-ndl-opac';
// 図書に絞る（旧仕様の mediatype=1 は今の API では 0 件になる）
const MEDIATYPE_BOOKS = 'books';
// 429（同時アクセス数の上限）・503 は、少し待ってやり直す
const RETRY_STATUSES = new Set([429, 503]);
const DEFAULT_RETRY_DELAYS_MS = [1000, 2000];

type FetchFn = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;
type SleepFn = (ms: number) => Promise<void>;

const defaultSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class NdlSearchProvider implements BookSearchProvider {
  readonly attribution = '国立国会図書館サーチ API を利用しています';
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly retryDelaysMs: readonly number[];
  private readonly sleep: SleepFn;

  constructor(
    options: { fetchFn?: FetchFn; timeoutMs?: number; retryDelaysMs?: readonly number[]; sleep?: SleepFn } = {},
  ) {
    this.fetchFn = options.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async search(keyword: string): Promise<BookSearchResult> {
    const trimmed = keyword.trim();
    const url =
      `${ENDPOINT}?title=${encodeURIComponent(trimmed)}` +
      `&cnt=${MAX_COUNT}&mediatype=${MEDIATYPE_BOOKS}&dpid=${DPID_NDL_OPAC}`;
    const body = await this.fetchWithRetry(url);
    if (body === null) return { status: 'error', reason: 'network' };
    try {
      return { status: 'ok', candidates: rankCandidates(trimmed, parseNdlResponse(body)) };
    } catch {
      return { status: 'error', reason: 'invalid_response' };
    }
  }

  private async fetchWithRetry(url: string): Promise<string | null> {
    for (let attempt = 0; ; attempt += 1) {
      const result = await this.fetchOnce(url);
      if (result.kind === 'ok') return result.body;
      const delay = this.retryDelaysMs[attempt];
      if (result.kind !== 'retryable' || delay === undefined) return null;
      await this.sleep(delay);
    }
  }

  private async fetchOnce(url: string): Promise<{ kind: 'ok'; body: string } | { kind: 'retryable' | 'failed' }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchFn(url, { signal: controller.signal });
      if (!response.ok) return { kind: RETRY_STATUSES.has(response.status) ? 'retryable' : 'failed' };
      return { kind: 'ok', body: await response.text() };
    } catch {
      return { kind: 'failed' };
    } finally {
      clearTimeout(timer);
    }
  }
}
