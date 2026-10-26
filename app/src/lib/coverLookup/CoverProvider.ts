export interface CoverProvider {
  readonly name: string;
  /** ISBN-13 から書影 URL を探す。見つからない・失敗したときは null（例外は投げない）。 */
  findCoverUrl(isbn13: string, signal: AbortSignal): Promise<string | null>;
}

export type FetchFn = (
  url: string,
  init?: { signal?: AbortSignal; method?: string },
) => Promise<Response>;

export function defaultFetch(): FetchFn {
  return (url, init) => globalThis.fetch(url, init);
}
