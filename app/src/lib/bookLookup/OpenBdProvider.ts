import type { BookInfo, BookLookupResult } from '../../types/book';
import type { BookLookupProvider } from './BookLookupProvider';

const ENDPOINT = 'https://api.openbd.jp/v1/get';
const DEFAULT_TIMEOUT_MS = 10000;

type FetchFn = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function toBookInfo(entry: unknown, isbn13: string): BookInfo | null {
  if (!isRecord(entry) || !isRecord(entry.summary)) return null;
  const summary = entry.summary;
  if (typeof summary.title !== 'string' || summary.title.trim() === '') return null;
  return {
    isbn: optionalText(summary.isbn) ?? isbn13,
    title: summary.title.trim(),
    author: optionalText(summary.author),
    publisher: optionalText(summary.publisher),
    coverUrl: optionalText(summary.cover),
  };
}

export class OpenBdProvider implements BookLookupProvider {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;

  constructor(options: { fetchFn?: FetchFn; timeoutMs?: number } = {}) {
    this.fetchFn = options.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async lookupByIsbn(isbn13: string): Promise<BookLookupResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchFn(`${ENDPOINT}?isbn=${isbn13}`, {
        signal: controller.signal,
      });
      if (!response.ok) return { status: 'error' };
      const json: unknown = await response.json();
      if (!Array.isArray(json)) return { status: 'error' };
      if (json.length === 0 || json[0] === null) return { status: 'not_found' };
      const book = toBookInfo(json[0], isbn13);
      return book ? { status: 'found', book } : { status: 'error' };
    } catch {
      return { status: 'error' };
    } finally {
      clearTimeout(timer);
    }
  }
}
