import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createDefaultMediaSearchProvider } from '../lib/mediaSearch';
import type { MediaSearchProvider } from '../lib/mediaSearch/MediaSearchProvider';

const MediaSearchContext = createContext<MediaSearchProvider | null>(null);

type ProviderProps = {
  /** undefined なら環境変数から作る。null は「未設定（検索の入口を出さない）」。 */
  provider?: MediaSearchProvider | null;
  children: ReactNode;
};

export function MediaSearchContextProvider({ provider, children }: ProviderProps) {
  const value = useMemo(
    () =>
      provider === undefined
        ? // ビルド時に埋め込まれるため、式をそのまま書く（間接参照しない）
          createDefaultMediaSearchProvider(process.env.EXPO_PUBLIC_TMDB_API_KEY)
        : provider,
    [provider],
  );
  return <MediaSearchContext.Provider value={value}>{children}</MediaSearchContext.Provider>;
}

/** API キー未設定のときは null。 */
export function useMediaSearch(): MediaSearchProvider | null {
  return useContext(MediaSearchContext);
}
