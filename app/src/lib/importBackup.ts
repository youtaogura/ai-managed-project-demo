import type { BackupFile, ImportMode } from '../types/backup';
import type { RecordRepository } from './recordRepository';
import type { SettingsStore } from './settingsStore';

type ApplyImportParams = {
  repository: RecordRepository;
  settingsStore: SettingsStore;
  backup: BackupFile;
  mode: ImportMode;
  includeSettings: boolean;
};

/** 読み込みを実行し、読み込み後の記録件数を返す。設定の保存に失敗したら記録を元に戻して reject する。 */
export async function applyImport({
  repository,
  settingsStore,
  backup,
  mode,
  includeSettings,
}: ApplyImportParams): Promise<number> {
  const before = await repository.getAll();
  const count = await repository.importRecords(backup.records, mode);
  if (includeSettings && backup.settings) {
    try {
      await settingsStore.save(backup.settings);
    } catch (error) {
      await repository.importRecords(before, 'replace');
      throw error;
    }
  }
  return count;
}
