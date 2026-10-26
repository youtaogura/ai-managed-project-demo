import type { BookLookupProvider } from '../bookLookup/BookLookupProvider';
import { OpenBdProvider } from '../bookLookup/OpenBdProvider';
import type { CoverProvider } from './CoverProvider';

/**
 * openBD の書誌情報から書影 URL を取り出す。
 * 応答の解釈は OpenBdProvider に任せる。締め切りは createCoverResolver 側で担保する。
 */
export class OpenBdCoverProvider implements CoverProvider {
  readonly name = 'openbd';
  private readonly lookup: BookLookupProvider;

  constructor(options: { lookup?: BookLookupProvider } = {}) {
    this.lookup = options.lookup ?? new OpenBdProvider();
  }

  async findCoverUrl(isbn13: string, signal: AbortSignal): Promise<string | null> {
    if (signal.aborted) return null;
    try {
      const result = await this.lookup.lookupByIsbn(isbn13);
      if (result.status !== 'found' || result.book.coverUrl === null) return null;
      return result.book.coverUrl.replace(/^http:\/\//, 'https://');
    } catch {
      return null;
    }
  }
}
