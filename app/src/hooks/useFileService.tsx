import { createContext, useContext, type ReactNode } from 'react';

import { defaultFileService } from '../lib/fileService';
import type { FileService } from '../lib/fileService/FileService';

const FileServiceContext = createContext<FileService | null>(null);

type ProviderProps = {
  service?: FileService;
  children: ReactNode;
};

export function FileServiceContextProvider({ service = defaultFileService, children }: ProviderProps) {
  return <FileServiceContext.Provider value={service}>{children}</FileServiceContext.Provider>;
}

export function useFileService(): FileService {
  const service = useContext(FileServiceContext);
  if (!service) throw new Error('FileServiceContextProvider が必要です');
  return service;
}
