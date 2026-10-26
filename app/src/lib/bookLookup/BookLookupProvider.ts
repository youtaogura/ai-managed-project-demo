import type { BookLookupResult } from '../../types/book';

export interface BookLookupProvider {
  lookupByIsbn(isbn13: string): Promise<BookLookupResult>;
}
