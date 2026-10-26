import { MEDIA_KINDS, type MediaKind } from './record';

export const HERO_CRITERIA_IDS = ['recent', 'inProgress', 'highRated', 'planned', 'none'] as const;
export type HeroCriterion = (typeof HERO_CRITERIA_IDS)[number];

export type AppSettings = {
  /** 使う種別。1 つ以上、`MEDIA_KINDS` の順。 */
  enabledKinds: MediaKind[];
  /** 記録一覧の上に大きく出す作品の条件。 */
  heroCriterion: HeroCriterion;
};

export const DEFAULT_SETTINGS: AppSettings = {
  enabledKinds: [...MEDIA_KINDS],
  heroCriterion: 'recent',
};
