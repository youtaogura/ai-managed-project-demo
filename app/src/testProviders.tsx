import type { ReactNode } from 'react';

import { SettingsContextProvider } from './hooks/useSettings';
import { ShelfRepositoryProvider } from './hooks/useShelfRepository';
import { NoteDraftStoreProvider } from './hooks/useNoteDraftStore';
import { WriteDraftStoreProvider } from './hooks/useWriteDraftStore';
import { RecordRepositoryProvider } from './hooks/useRecordRepository';
import type { NoteDraftStore } from './lib/noteDraftStore';
import type { WriteDraftStore } from './lib/writeDraftStore';
import type { RecordRepository } from './lib/recordRepository';
import type { SettingsStore } from './lib/settingsStore';
import type { ShelfRepository } from './lib/shelfRepository';
import { createShelfRepository } from './lib/shelfRepository';
import { createMemoryStorage } from './testUtils';

export function withRepository(
  repository: RecordRepository,
  children: ReactNode,
  shelfRepository: ShelfRepository = createShelfRepository(createMemoryStorage().storage),
) {
  return (
    <RecordRepositoryProvider repository={repository}>
      <ShelfRepositoryProvider repository={shelfRepository}>{children}</ShelfRepositoryProvider>
    </RecordRepositoryProvider>
  );
}

/** 設定ストアを注入する。 */
export function withSettings(store: SettingsStore, children: ReactNode) {
  return <SettingsContextProvider store={store}>{children}</SettingsContextProvider>;
}

/** 本棚の repository を注入する。 */
export function withShelfRepository(repository: ShelfRepository, children: ReactNode) {
  return <ShelfRepositoryProvider repository={repository}>{children}</ShelfRepositoryProvider>;
}

/** 書きかけ（メモ・引用）の保存先を注入する。 */
export function withNoteDraftStore(store: NoteDraftStore, children: ReactNode) {
  return <NoteDraftStoreProvider store={store}>{children}</NoteDraftStoreProvider>;
}

/** 書きかけ（読後メモを書く画面）の保存先を注入する。 */
export function withWriteDraftStore(store: WriteDraftStore, children: ReactNode) {
  return <WriteDraftStoreProvider store={store}>{children}</WriteDraftStoreProvider>;
}
