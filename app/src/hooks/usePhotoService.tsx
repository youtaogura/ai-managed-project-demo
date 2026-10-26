import { createContext, useContext, type ReactNode } from 'react';

import { expoPhotoService } from '../lib/photo';
import type { PhotoService } from '../lib/photo/PhotoService';

const PhotoServiceContext = createContext<PhotoService | null>(null);

type ProviderProps = {
  service?: PhotoService;
  children: ReactNode;
};

export function PhotoServiceContextProvider({ service = expoPhotoService, children }: ProviderProps) {
  return <PhotoServiceContext.Provider value={service}>{children}</PhotoServiceContext.Provider>;
}

export function usePhotoService(): PhotoService {
  const service = useContext(PhotoServiceContext);
  if (!service) throw new Error('PhotoServiceContextProvider が必要です');
  return service;
}
