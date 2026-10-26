import type {
  MediaCandidate,
  MediaSearchKind,
  MediaSearchResult,
} from '../../../types/mediaSearch';
import type { MediaSearchProvider } from '../MediaSearchProvider';
import { orderAnimeCandidates } from '../orderCandidates';
import { parseCreators, parseSearchResults } from './parseTmdb';

const BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_TIMEOUT_MS = 10000;
export const MAX_RESULTS = 10;
const LANGUAGE = 'ja-JP';

/** TMDb 指定の利用表記。「このアプリについて」からも再利用できるよう export する。 */
export const TMDB_ATTRIBUTION =
  'This product uses the TMDB API but is not endorsed or certified by TMDB.';

type FetchFn = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>;

type MediaType = MediaCandidate['mediaType'];

class NetworkError extends Error {}
class InvalidResponseError extends Error {}

export class TmdbSearchProvider implements MediaSearchProvider {
  readonly attribution = TMDB_ATTRIBUTION;
  private readonly apiKey: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;

  constructor(options: { apiKey: string; fetchFn?: FetchFn; timeoutMs?: number }) {
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async search(keyword: string, kind: MediaSearchKind): Promise<MediaSearchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const candidates = await this.searchCandidates(keyword.trim(), kind, controller.signal);
      const withCreators = await Promise.all(
        candidates.map(async (candidate) => ({
          ...candidate,
          creator: await this.fetchCreator(candidate, controller.signal),
        })),
      );
      return { status: 'ok', candidates: withCreators };
    } catch (error) {
      if (error instanceof InvalidResponseError) {
        return { status: 'error', reason: 'invalid_response' };
      }
      return { status: 'error', reason: 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  private async searchCandidates(
    keyword: string,
    kind: MediaSearchKind,
    signal: AbortSignal,
  ): Promise<MediaCandidate[]> {
    if (kind === 'anime') {
      const [movies, tvs] = await Promise.all([
        this.searchOne(keyword, 'movie', signal),
        this.searchOne(keyword, 'tv', signal),
      ]);
      return orderAnimeCandidates(movies, tvs, MAX_RESULTS);
    }
    const mediaType: MediaType = kind === 'movie' ? 'movie' : 'tv';
    return (await this.searchOne(keyword, mediaType, signal)).slice(0, MAX_RESULTS);
  }

  private async searchOne(
    keyword: string,
    mediaType: MediaType,
    signal: AbortSignal,
  ): Promise<MediaCandidate[]> {
    const json = await this.getJson(
      `/search/${mediaType}`,
      { query: keyword, language: LANGUAGE, include_adult: 'false' },
      signal,
    );
    const candidates = parseSearchResults(json, mediaType);
    if (candidates === null) throw new InvalidResponseError();
    return candidates;
  }

  private async fetchCreator(
    candidate: MediaCandidate,
    signal: AbortSignal,
  ): Promise<string | null> {
    try {
      const params: Record<string, string> = { language: LANGUAGE };
      if (candidate.mediaType === 'movie') params.append_to_response = 'credits';
      const json = await this.getJson(
        `/${candidate.mediaType}/${candidate.tmdbId}`,
        params,
        signal,
      );
      return parseCreators(json, candidate.mediaType);
    } catch {
      return null;
    }
  }

  private async getJson(
    path: string,
    params: Record<string, string>,
    signal: AbortSignal,
  ): Promise<unknown> {
    const query = new URLSearchParams(params);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey.startsWith('eyJ')) headers.Authorization = `Bearer ${this.apiKey}`;
    else query.set('api_key', this.apiKey);
    let body: string;
    try {
      const response = await this.fetchFn(`${BASE_URL}${path}?${query.toString()}`, {
        signal,
        headers,
      });
      if (!response.ok) throw new NetworkError();
      body = await response.text();
    } catch {
      throw new NetworkError();
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new InvalidResponseError();
    }
  }
}
