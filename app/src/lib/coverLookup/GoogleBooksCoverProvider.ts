import { defaultFetch, type CoverProvider, type FetchFn } from './CoverProvider';

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function extractCoverUrl(json: unknown): string | null {
  if (!isRecord(json) || !Array.isArray(json.items)) return null;
  const item: unknown = json.items[0];
  if (!isRecord(item) || !isRecord(item.volumeInfo)) return null;
  const links = item.volumeInfo.imageLinks;
  if (!isRecord(links)) return null;
  const url = nonEmptyText(links.thumbnail) ?? nonEmptyText(links.smallThumbnail);
  return url === null ? null : url.replace(/^http:\/\//, 'https://');
}

/** Google Books API（キーなし）。imageLinks の thumbnail を使う。 */
export class GoogleBooksCoverProvider implements CoverProvider {
  readonly name = 'google-books';
  private readonly fetchFn: FetchFn;

  constructor(options: { fetchFn?: FetchFn } = {}) {
    this.fetchFn = options.fetchFn ?? defaultFetch();
  }

  async findCoverUrl(isbn13: string, signal: AbortSignal): Promise<string | null> {
    try {
      const response = await this.fetchFn(`${ENDPOINT}?q=isbn:${isbn13}&maxResults=1`, { signal });
      if (!response.ok) return null;
      const json: unknown = await response.json();
      return extractCoverUrl(json);
    } catch {
      return null;
    }
  }
}
