import type { RecordStatus } from './record';

export type AppSettings = {
  /** 新しく記録するときのステータスの初期値。 */
  defaultStatus: RecordStatus;
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultStatus: 'completed',
};
