import type { ReactNode } from 'react';

import { CoverResolverContextProvider } from './hooks/useCoverResolver';
import { PhotoServiceContextProvider } from './hooks/usePhotoService';
import { RecordRepositoryProvider } from './hooks/useRecordRepository';
import type { CoverResolver } from './lib/coverLookup/resolveCoverUrl';
import type { PhotoService } from './lib/photo/PhotoService';
import type { RecordRepository } from './lib/recordRepository';
import { createMockPhotoService } from './testUtils';

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
