import type { ReactNode } from 'react';

import { CoverResolverContextProvider } from './hooks/useCoverResolver';
import { SettingsContextProvider } from './hooks/useSettings';
import { PhotoServiceContextProvider } from './hooks/usePhotoService';
import { RecordRepositoryProvider } from './hooks/useRecordRepository';
import type { CoverResolver } from './lib/coverLookup/resolveCoverUrl';
import type { PhotoService } from './lib/photo/PhotoService';
import type { RecordRepository } from './lib/recordRepository';
import { createSettingsStore, SETTINGS_STORAGE_KEY, type SettingsStore } from './lib/settingsStore';
import type { MediaKind } from './types/record';
import { createMemoryStorage, createMockPhotoService } from './testUtils';

const noCover: CoverResolver = async () => null;

export function withRepository(
  repository: RecordRepository,
  children: ReactNode,
  photoService: PhotoService = createMockPhotoService(),
  resolver: CoverResolver = noCover,
) {
  return (
    <RecordRepositoryProvider repository={repository}>
      <CoverResolverContextProvider resolver={resolver}>
        <PhotoServiceContextProvider service={photoService}>{children}</PhotoServiceContextProvider>
      </CoverResolverContextProvider>
    </RecordRepositoryProvider>
  );
}

/** 設定を注入する。MediaKind[] を渡すと、その種別だけを使う設定で始まる。 */
export function withSettings(settings: SettingsStore | MediaKind[], children: ReactNode) {
  const store: SettingsStore = Array.isArray(settings)
    ? createSettingsStore(
        createMemoryStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify({ enabledKinds: settings }) })
          .storage,
      )
    : settings;
  return <SettingsContextProvider store={store}>{children}</SettingsContextProvider>;
}
