import type { BackupFile, ImportMode } from '../types/backup';
import type { RecordRepository } from './recordRepository';
import type { SettingsStore } from './settingsStore';
import type { ShelfRepository } from './shelfRepository';

type ApplyImportParams = {
  repository: RecordRepository;
  shelfRepository: ShelfRepository;
  settingsStore: SettingsStore;
  backup: BackupFile;
  mode: ImportMode;
  includeSettings: boolean;
};

/** 読み込みを実行し、読み込み後の記録件数を返す。途中で失敗したら記録・本棚・設定を元に戻して reject する。 */
export async function applyImport({
  repository,
  shelfRepository,
  settingsStore,
  backup,
  mode,
  includeSettings,
}: ApplyImportParams): Promise<number> {
  const beforeRecords = await repository.getAll();
  const beforeShelves = await shelfRepository.getAll();
  const beforeSettings = await settingsStore.load();
  try {
    const count = await repository.importRecords(backup.records, mode);
    await shelfRepository.importShelves(backup.shelves, mode);
    if (includeSettings && backup.settings) await settingsStore.save(backup.settings);
    return count;
  } catch (error) {
    await Promise.allSettled([
      repository.importRecords(beforeRecords, 'replace'),
      shelfRepository.importShelves(beforeShelves, 'replace'),
      settingsStore.save(beforeSettings),
    ]);
    throw error;
  }
}
