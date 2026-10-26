import type { ReactNode } from 'react';

import { RecordRepositoryProvider } from './hooks/useRecordRepository';
import type { RecordRepository } from './lib/recordRepository';

export function withRepository(repository: RecordRepository, children: ReactNode) {
  return <RecordRepositoryProvider repository={repository}>{children}</RecordRepositoryProvider>;
}
