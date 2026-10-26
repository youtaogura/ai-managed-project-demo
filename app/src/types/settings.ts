import { MEDIA_KINDS, type MediaKind } from './record';

export type AppSettings = {
  /** 使う種別。1 つ以上、`MEDIA_KINDS` の順。 */
  enabledKinds: MediaKind[];
};

export const DEFAULT_SETTINGS: AppSettings = {
  enabledKinds: [...MEDIA_KINDS],
};
