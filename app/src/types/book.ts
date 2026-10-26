export type BookInfo = {
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  coverUrl: string | null;
};

export type BookLookupResult =
  { status: 'found'; book: BookInfo } | { status: 'not_found' } | { status: 'error' };
