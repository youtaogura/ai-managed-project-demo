import type { MediaSearchProvider } from './MediaSearchProvider';
import { TmdbSearchProvider } from './tmdb/TmdbSearchProvider';

/** 既定の作品検索 Provider を登録する唯一の場所。API キーがなければ null（入口を出さない）。 */
export function createDefaultMediaSearchProvider(
  apiKey: string | undefined,
): MediaSearchProvider | null {
  if (apiKey === undefined || apiKey.trim() === '') return null;
  return new TmdbSearchProvider({ apiKey: apiKey.trim() });
}
