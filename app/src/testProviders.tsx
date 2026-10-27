import type { ReactNode } from 'react';

import { CoverResolverContextProvider } from './hooks/useCoverResolver';
import { SettingsContextProvider } from './hooks/useSettings';
import { ShelfRepositoryProvider } from './hooks/useShelfRepository';
import { StarterSettingsContextProvider } from './hooks/useStarterSettings';
import { NoteDraftStoreProvider } from './hooks/useNoteDraftStore';
import { WriteDraftStoreProvider } from './hooks/useWriteDraftStore';
import { PhotoServiceContextProvider } from './hooks/usePhotoService';
import { RecordRepositoryProvider } from './hooks/useRecordRepository';
import type { CoverResolver } from './lib/coverLookup/resolveCoverUrl';
import type { NoteDraftStore } from './lib/noteDraftStore';
import type { WriteDraftStore } from './lib/writeDraftStore';
import type { PhotoService } from './lib/photo/PhotoService';
import type { RecordRepository } from './lib/recordRepository';
import type { SettingsStore } from './lib/settingsStore';
import type { ShelfRepository } from './lib/shelfRepository';
import type { StarterSettingsStore } from './lib/starterSettingsStore';
import { createShelfRepository } from './lib/shelfRepository';
import { createMemoryStorage, createMockPhotoService } from './testUtils';

const noCover: CoverResolver = async () => null;

export function withRepository(
  repository: RecordRepository,
  children: ReactNode,
  photoService: PhotoService = createMockPhotoService(),
  resolver: CoverResolver = noCover,
  shelfRepository: ShelfRepository = createShelfRepository(createMemoryStorage().storage),
) {
  return (
    <RecordRepositoryProvider repository={repository}>
      <CoverResolverContextProvider resolver={resolver}>
        <ShelfRepositoryProvider repository={shelfRepository}>
          <PhotoServiceContextProvider service={photoService}>{children}</PhotoServiceContextProvider>
        </ShelfRepositoryProvider>
      </CoverResolverContextProvider>
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

/** 書き出し設定のストアを注入する。 */
export function withStarterSettings(store: StarterSettingsStore, children: ReactNode) {
  return <StarterSettingsContextProvider store={store}>{children}</StarterSettingsContextProvider>;
}

/** 書きかけ（メモ・引用）の保存先を注入する。 */
export function withNoteDraftStore(store: NoteDraftStore, children: ReactNode) {
  return <NoteDraftStoreProvider store={store}>{children}</NoteDraftStoreProvider>;
}

/** 書きかけ（書き出しの続き）の保存先を注入する。 */
export function withWriteDraftStore(store: WriteDraftStore, children: ReactNode) {
  return <WriteDraftStoreProvider store={store}>{children}</WriteDraftStoreProvider>;
}
