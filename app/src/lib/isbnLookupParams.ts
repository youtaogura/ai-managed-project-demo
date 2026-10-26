import type { BookInfo } from '../types/book';

export function bookInfoToParams(book: BookInfo): Record<string, string> {
  const params: Record<string, string> = { kind: 'book', title: book.title, isbn: book.isbn };
  if (book.author !== null) params.creator = book.author;
  if (book.publisher !== null) params.publisher = book.publisher;
  if (book.coverUrl !== null) params.coverUrl = book.coverUrl;
  return params;
}

export function isbnOnlyParams(isbn: string | null): Record<string, string> {
  return isbn === null ? { kind: 'book' } : { kind: 'book', isbn };
}
