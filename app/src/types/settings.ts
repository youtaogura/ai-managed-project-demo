import { MEDIA_KINDS, type MediaKind } from './record';

/** 記録するかどうかを選べる項目。設定画面に出す順。 */
export const RECORD_FIELDS = [
  'rating',
  'status',
  'startDate',
  'endDate',
  'review',
  'photo',
] as const;
export type RecordFieldKey = (typeof RECORD_FIELDS)[number];
export const HERO_CRITERIA_IDS = ['recent', 'inProgress', 'highRated', 'planned', 'none'] as const;
export type HeroCriterion = (typeof HERO_CRITERIA_IDS)[number];

export type AppSettings = {
  /** 使う種別。1 つ以上、`MEDIA_KINDS` の順。 */
  enabledKinds: MediaKind[];
  /** 記録する項目のオン・オフ。 */
  enabledFields: Record<RecordFieldKey, boolean>;
  /** 記録一覧の上に大きく出す作品の条件。 */
  heroCriterion: HeroCriterion;
};

export const DEFAULT_SETTINGS: AppSettings = {
  enabledKinds: [...MEDIA_KINDS],
  enabledFields: {
    rating: true,
    status: true,
    startDate: true,
    endDate: true,
    review: true,
    photo: true,
  },
  heroCriterion: 'recent',
};
