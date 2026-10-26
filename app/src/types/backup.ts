import type { MediaRecord } from './record';
import type { AppSettings } from './settings';

export const BACKUP_FORMAT = 'ai-managed-records-backup';
export const BACKUP_VERSION = 1;

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** ISO 8601 */
  exportedAt: string;
  /** photoUri は常に null */
  records: MediaRecord[];
  settings: AppSettings | null;
};

export type ImportMode = 'merge' | 'replace';

export type BackupFailureReason = 'not_json' | 'not_backup' | 'too_new' | 'invalid';

export type ParseBackupResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; reason: BackupFailureReason };
