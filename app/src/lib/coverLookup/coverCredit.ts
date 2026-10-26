/** 書影の取得元に応じたクレジット表記。表記が不要なら null。 */
export function coverCreditLabel(coverUrl: string | null): string | null {
  if (coverUrl === null) return null;
  if (coverUrl.includes('books.google.com') || coverUrl.includes('googleusercontent.com')) {
    return '書影: Google Books';
  }
  if (coverUrl.includes('ndlsearch.ndl.go.jp')) return '書影: 国立国会図書館サーチ';
  return null;
}
