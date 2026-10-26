import type { BookSearchProvider } from './BookSearchProvider';
import { NdlSearchProvider } from './ndl/NdlSearchProvider';

/** 既定のタイトル検索 Provider を登録する唯一の場所。 */
export function createDefaultBookSearchProvider(): BookSearchProvider {
  return new NdlSearchProvider();
}
