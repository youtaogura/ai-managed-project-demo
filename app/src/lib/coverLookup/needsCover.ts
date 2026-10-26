import type { MediaRecord } from '../../types/record';

/** 書影を自動取得する対象か（本・漫画で ISBN があり、写真も書影 URL もない）。 */
export function needsCover(
  record: Pick<MediaRecord, 'kind' | 'isbn' | 'coverUrl' | 'photoUri'>,
): boolean {
  return (
    (record.kind === 'book' || record.kind === 'manga') &&
    record.isbn !== null &&
    record.coverUrl === null &&
    record.photoUri === null
  );
}
