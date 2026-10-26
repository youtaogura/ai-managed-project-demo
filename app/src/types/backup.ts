import type { MediaRecord } from './record';
import type { AppSettings } from './settings';
import type { Shelf } from './shelf';
import type { StarterSettings } from './starter';

export const BACKUP_FORMAT = 'ai-managed-records-backup';
export const BACKUP_VERSION = 2;

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** ISO 8601 */
  exportedAt: string;
  /** photoUri は常に null */
  records: MediaRecord[];
  shelves: Shelf[];
  starterSettings: StarterSettings | null;
  settings: AppSettings | null;
};

export type ImportMode = 'merge' | 'replace';

export type BackupFailureReason = 'not_json' | 'not_backup' | 'too_new' | 'invalid';

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; reason: BackupFailureReason };
