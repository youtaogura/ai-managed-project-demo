import type { MediaSearchKind, MediaSearchResult } from '../../types/mediaSearch';

export interface MediaSearchProvider {
  /** API の利用表記（画面に常時表示する）。 */
  readonly attribution: string;
  search(keyword: string, kind: MediaSearchKind): Promise<MediaSearchResult>;
}
