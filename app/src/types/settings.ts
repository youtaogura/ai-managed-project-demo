import type { RecordStatus } from './record';

export const HERO_CRITERIA_IDS = ['recent', 'inProgress', 'highRated', 'planned', 'none'] as const;
export type HeroCriterion = (typeof HERO_CRITERIA_IDS)[number];

export type AppSettings = {
  /** 記録一覧の上に大きく出す作品の条件。 */
  heroCriterion: HeroCriterion;
  /** 新しく記録するときのステータスの初期値。 */
  defaultStatus: RecordStatus;
};

export const DEFAULT_SETTINGS: AppSettings = {
  heroCriterion: 'recent',
  defaultStatus: 'completed',
};
