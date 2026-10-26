import type { BookInfo } from '../../types/book';
import type { CoverResolver } from './resolveCoverUrl';

/** 書影がない書誌情報に、取得できた書影 URL を補う。失敗しても元の書誌情報を返す。 */
export async function withCover(book: BookInfo, resolver: CoverResolver): Promise<BookInfo> {
  if (book.coverUrl !== null) return book;
  try {
    const coverUrl = await resolver(book.isbn);
    return coverUrl === null ? book : { ...book, coverUrl };
  } catch {
    return book;
  }
}
