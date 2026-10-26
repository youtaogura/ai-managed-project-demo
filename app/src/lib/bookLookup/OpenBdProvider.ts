import type { BookLookupResult } from '../../types/book';
import type { BookLookupProvider } from './BookLookupProvider';

const ENDPOINT = 'https://api.openbd.jp/v1/get';

type FetchFn = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function parseResponse(body: unknown, isbn13: string): BookLookupResult {
  if (!Array.isArray(body)) return { status: 'error' };
  const first: unknown = body[0];
  if (first === null || first === undefined) return { status: 'not_found' };
  if (!isRecord(first) || !isRecord(first.summary)) return { status: 'error' };
  const summary = first.summary;
  const title = textOrNull(summary.title);
  if (title === null) return { status: 'error' };
  return {
    status: 'found',
    book: {
      isbn: textOrNull(summary.isbn) ?? isbn13,
      title,
      author: textOrNull(summary.author),
      publisher: textOrNull(summary.publisher),
      coverUrl: textOrNull(summary.cover),
    },
  };
}

export class OpenBdProvider implements BookLookupProvider {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;

  constructor(fetchFn: FetchFn = (url, init) => fetch(url, init), timeoutMs = 10000) {
    this.fetchFn = fetchFn;
    this.timeoutMs = timeoutMs;
  }

  async lookupByIsbn(isbn13: string): Promise<BookLookupResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchFn(`${ENDPOINT}?isbn=${isbn13}`, {
        signal: controller.signal,
      });
      if (!response.ok) return { status: 'error' };
      return parseResponse(await response.json(), isbn13);
    } catch {
      return { status: 'error' };
    } finally {
      clearTimeout(timer);
    }
  }
}
