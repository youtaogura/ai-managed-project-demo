import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { RecordRepository } from '../lib/recordRepository';
import type { MediaRecord } from '../types/record';

export function useRecords(repository: RecordRepository) {
  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setRecords(await repository.getAll());
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { records, loading, reload };
}
