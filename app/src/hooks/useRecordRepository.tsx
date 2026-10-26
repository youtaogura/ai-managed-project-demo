import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { createRecordRepository, type RecordRepository } from '../lib/recordRepository';
import { asyncKeyValueStorage } from '../lib/storage';

const RecordRepositoryContext = createContext<RecordRepository | null>(null);

type ProviderProps = {
  repository?: RecordRepository;
  children: ReactNode;
};

export function RecordRepositoryProvider({ repository, children }: ProviderProps) {
  const value = useMemo(
    () => repository ?? createRecordRepository(asyncKeyValueStorage),
    [repository],
  );
  useEffect(() => {
    void value.migrate();
  }, [value]);
  return (
    <RecordRepositoryContext.Provider value={value}>{children}</RecordRepositoryContext.Provider>
  );
}

export function useRecordRepository(): RecordRepository {
  const repository = useContext(RecordRepositoryContext);
  if (!repository) throw new Error('RecordRepositoryProvider が必要です');
  return repository;
}
