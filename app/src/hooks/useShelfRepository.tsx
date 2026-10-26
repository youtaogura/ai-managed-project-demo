import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createShelfRepository, type ShelfRepository } from '../lib/shelfRepository';
import { asyncKeyValueStorage } from '../lib/storage';

const ShelfRepositoryContext = createContext<ShelfRepository | null>(null);

type ProviderProps = {
  repository?: ShelfRepository;
  children: ReactNode;
};

export function ShelfRepositoryProvider({ repository, children }: ProviderProps) {
  const value = useMemo(() => repository ?? createShelfRepository(asyncKeyValueStorage), [repository]);
  return <ShelfRepositoryContext.Provider value={value}>{children}</ShelfRepositoryContext.Provider>;
}

export function useShelfRepository(): ShelfRepository {
  const repository = useContext(ShelfRepositoryContext);
  if (!repository) throw new Error('ShelfRepositoryProvider が必要です');
  return repository;
}
