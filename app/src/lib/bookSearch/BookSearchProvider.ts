import type { BookSearchResult } from '../../types/bookSearch';

export interface BookSearchProvider {
  /** API の利用表記（画面に常時表示する）。 */
  readonly attribution: string;
  search(keyword: string): Promise<BookSearchResult>;
}
