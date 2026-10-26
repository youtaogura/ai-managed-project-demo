import { OpenBdCoverProvider } from './OpenBdCoverProvider';
import { createCoverResolver, type CoverResolver } from './resolveCoverUrl';

/** 既定の書影取得元（openBD だけ）を登録する唯一の場所。取得元を足すときはここに追加する。 */
export function createDefaultCoverResolver(): CoverResolver {
  return createCoverResolver([new OpenBdCoverProvider()]);
}
