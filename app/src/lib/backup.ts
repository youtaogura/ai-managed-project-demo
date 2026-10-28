import type { BackupFile, ParseBackupResult } from '../types/backup';
import { BACKUP_FORMAT, BACKUP_VERSION, OLDEST_BACKUP_VERSION } from './constants';
import type { MediaRecord } from '../types/record';
import type { AppSettings } from '../types/settings';
import type { Shelf } from '../types/shelf';
import { isMediaRecord, parseRecords } from './recordGuard';
import { toPostReadMemos } from './recordMigration';
import { parseSettings } from './settingsStore';
import { isShelf, normalizeShelves } from './shelfGuard';

/** 書き出し用のバックアップを作る。写真は端末固有のパスなので含めない。入力は書き換えない。 */
export function buildBackup(
  records: readonly MediaRecord[],
  shelves: readonly Shelf[],
  settings: AppSettings,
  exportedAt: string,
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    records: records.map((record) => ({ ...record, photoUri: null })),
    shelves: shelves.map((shelf) => ({ ...shelf })),
    settings: { ...settings },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasUniqueIds(records: readonly { id: string }[]): boolean {
  return new Set(records.map((r) => r.id)).size === records.length;
}

/**
 * バックアップのテキストを検証して読む。例外は投げない。
 * 版 2（書き出し・自由記述・書き出しの設定があった版）も読み、記録は読後メモの形に直す。書き出しの設定は無視する。
 */
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
  if (typeof parsed.version !== 'number' || parsed.version < OLDEST_BACKUP_VERSION) {
    return { ok: false, reason: 'invalid' };
  }
  const { exportedAt } = parsed;
  const rawRecords = Array.isArray(parsed.records) ? parsed.records.map(toPostReadMemos) : parsed.records;
  if (typeof exportedAt !== 'string' || Number.isNaN(new Date(exportedAt).getTime())) {
    return { ok: false, reason: 'invalid' };
  }
  // 1 件でも不正なら全体を不正とする（一部だけ読むと欠落に気づけない）
  if (!Array.isArray(rawRecords) || !rawRecords.every(isMediaRecord)) {
    return { ok: false, reason: 'invalid' };
  }
  const records = parseRecords(rawRecords);
  if (!hasUniqueIds(records)) return { ok: false, reason: 'invalid' };
  const { shelves: rawShelves } = parsed;
  if (!Array.isArray(rawShelves) || !rawShelves.every(isShelf)) {
    return { ok: false, reason: 'invalid' };
  }
  if (!hasUniqueIds(rawShelves)) return { ok: false, reason: 'invalid' };
  const shelves = normalizeShelves(rawShelves);
  const shelfIds = new Set(shelves.map((s) => s.id));
  if (records.some((r) => r.shelfIds.some((id) => !shelfIds.has(id)))) {
    return { ok: false, reason: 'invalid' };
  }
  const settings = isObject(parsed.settings) ? parseSettings(JSON.stringify(parsed.settings)) : null;
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      records,
      shelves,
      settings,
    },
  };
}
