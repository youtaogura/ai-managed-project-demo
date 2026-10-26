import type { BookLookupProvider } from './BookLookupProvider';
import { OpenBdProvider } from './OpenBdProvider';

/** 既定の書誌情報 Provider を登録する唯一の場所。 */
export function createDefaultBookLookupProvider(): BookLookupProvider {
  return new OpenBdProvider();
}
