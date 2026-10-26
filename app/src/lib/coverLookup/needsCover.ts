import type { MediaRecord } from '../../types/record';

/** 書影を自動取得する対象か（ISBN があり、写真も書影 URL もない）。 */
export function needsCover(record: Pick<MediaRecord, 'isbn' | 'coverUrl' | 'photoUri'>): boolean {
  return record.isbn !== null && record.coverUrl === null && record.photoUri === null;
}
