import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Shelf } from '../types/shelf';
import { useShelfRepository } from './useShelfRepository';

/** 画面に戻るたび本棚を読み直す。読み込みに失敗したら 0 件として扱う。 */
export function useShelves() {
  const repository = useShelfRepository();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setShelves(await repository.getAll());
    } catch {
      setShelves([]);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { shelves, reload, loading };
}
