import { isValidEan13 } from './isbn';

export { isValidEan13 };

/** 書籍の 1 段目（978 / 979）の EAN-13 だけ ISBN-13 として返す。192 などは null。 */
export function isbnFromBarcode(scan: { type: string; data: string }): string | null {
  if (scan.type !== 'ean13') return null;
  if (!/^97[89]/.test(scan.data) || !isValidEan13(scan.data)) return null;
  return scan.data;
}
