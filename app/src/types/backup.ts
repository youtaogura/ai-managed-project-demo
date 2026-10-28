import type { BACKUP_FORMAT, BACKUP_VERSION } from '../lib/constants';
import type { MediaRecord } from './record';
import type { AppSettings } from './settings';
import type { Shelf } from './shelf';

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  records: MediaRecord[];
  shelves: Shelf[];
  settings: AppSettings | null;
};

export type ImportMode = 'merge' | 'replace';

export type BackupFailureReason = 'not_json' | 'not_backup' | 'too_new' | 'invalid';

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; reason: BackupFailureReason };
