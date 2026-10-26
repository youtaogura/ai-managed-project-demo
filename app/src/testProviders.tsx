import type { ReactNode } from 'react';

import { PhotoServiceContextProvider } from './hooks/usePhotoService';
import { RecordRepositoryProvider } from './hooks/useRecordRepository';
import type { PhotoService } from './lib/photo/PhotoService';
import type { RecordRepository } from './lib/recordRepository';
import { createMockPhotoService } from './testUtils';

export function withRepository(
  repository: RecordRepository,
  children: ReactNode,
  photoService: PhotoService = createMockPhotoService(),
) {
  return (
    <RecordRepositoryProvider repository={repository}>
      <PhotoServiceContextProvider service={photoService}>{children}</PhotoServiceContextProvider>
    </RecordRepositoryProvider>
  );
}
