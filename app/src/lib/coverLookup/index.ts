import { GoogleBooksCoverProvider } from './GoogleBooksCoverProvider';
import { NdlCoverProvider } from './NdlCoverProvider';
import { createCoverResolver, type CoverResolver } from './resolveCoverUrl';

/** 既定の書影取得元（NDL → Google Books の順）を登録する唯一の場所。 */
export function createDefaultCoverResolver(): CoverResolver {
  return createCoverResolver([new NdlCoverProvider(), new GoogleBooksCoverProvider()]);
}
