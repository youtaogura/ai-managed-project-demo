export type BookCandidate = {
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: string | null;
  isbn: string | null;
};

export type BookSearchError = 'network' | 'invalid_response';

export type BookSearchResult =
  | { status: 'ok'; candidates: BookCandidate[] }
  | { status: 'error'; reason: BookSearchError };
