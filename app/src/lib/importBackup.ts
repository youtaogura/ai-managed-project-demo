import type { BackupFile, ImportMode } from '../types/backup';
import type { RecordRepository } from './recordRepository';
import type { SettingsStore } from './settingsStore';
import type { ShelfRepository } from './shelfRepository';
import type { StarterSettingsStore } from './starterSettingsStore';

type ApplyImportParams = {
  repository: RecordRepository;
  shelfRepository: ShelfRepository;
  settingsStore: SettingsStore;
  starterSettingsStore: StarterSettingsStore;
  backup: BackupFile;
  mode: ImportMode;
  includeSettings: boolean;
};

/** 読み込みを実行し、読み込み後の記録件数を返す。途中で失敗したら記録・本棚・設定を元に戻して reject する。 */
export async function applyImport({
  repository,
  shelfRepository,
  settingsStore,
  starterSettingsStore,
  backup,
  mode,
  includeSettings,
}: ApplyImportParams): Promise<number> {
  const beforeRecords = await repository.getAll();
  const beforeShelves = await shelfRepository.getAll();
  const beforeSettings = await settingsStore.load();
  const beforeStarterSettings = await starterSettingsStore.load();
  try {
    const count = await repository.importRecords(backup.records, mode);
    await shelfRepository.importShelves(backup.shelves, mode);
    if (includeSettings) {
      if (backup.starterSettings) await starterSettingsStore.save(backup.starterSettings);
      if (backup.settings) await settingsStore.save(backup.settings);
    }
    return count;
  } catch (error) {
    await Promise.allSettled([
      repository.importRecords(beforeRecords, 'replace'),
      shelfRepository.importShelves(beforeShelves, 'replace'),
      starterSettingsStore.save(beforeStarterSettings),
      settingsStore.save(beforeSettings),
    ]);
    throw error;
  }
}
