import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupFile,
  type ParseBackupResult,
} from '../types/backup';
import type { MediaRecord } from '../types/record';
import type { AppSettings } from '../types/settings';
import { isMediaRecord, parseRecords } from './recordGuard';
import { parseSettings } from './settingsStore';

/** 書き出し用のバックアップを作る。写真は端末固有のパスなので含めない。入力は書き換えない。 */
export function buildBackup(
  records: readonly MediaRecord[],
  settings: AppSettings,
  exportedAt: string,
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    records: records.map((record) => ({ ...record, photoUri: null })),
    settings: { ...settings },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasUniqueIds(records: readonly MediaRecord[]): boolean {
  return new Set(records.map((r) => r.id)).size === records.length;
}

/** バックアップのテキストを検証して読む。例外は投げない。 */
export function parseBackup(text: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not_json' };
  }
  if (!isObject(parsed) || parsed.format !== BACKUP_FORMAT || !Number.isInteger(parsed.version)) {
    return { ok: false, reason: 'not_backup' };
  }
  if (typeof parsed.version === 'number' && parsed.version > BACKUP_VERSION) {
    return { ok: false, reason: 'too_new' };
  }
  const { exportedAt, records: rawRecords } = parsed;
  if (typeof exportedAt !== 'string' || Number.isNaN(new Date(exportedAt).getTime())) {
    return { ok: false, reason: 'invalid' };
  }
  // 1 件でも不正なら全体を不正とする（一部だけ読むと欠落に気づけない）
  if (!Array.isArray(rawRecords) || !rawRecords.every(isMediaRecord)) {
    return { ok: false, reason: 'invalid' };
  }
  const records = parseRecords(rawRecords);
  if (!hasUniqueIds(records)) return { ok: false, reason: 'invalid' };
  const settings = isObject(parsed.settings)
    ? parseSettings(JSON.stringify(parsed.settings))
    : null;
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      records,
      settings,
    },
  };
}
