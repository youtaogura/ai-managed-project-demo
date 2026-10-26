import { useCallback, useEffect, useState } from 'react';

import type { SortOrderStore } from '../lib/sortOrderStore';
import { DEFAULT_SORT_ORDER, type SortOrder } from '../types/sort';

export function useSortOrder(store: SortOrderStore): [SortOrder, (order: SortOrder) => void] {
  const [order, setOrderState] = useState<SortOrder>(DEFAULT_SORT_ORDER);

  useEffect(() => {
    let active = true;
    void store.load().then((loaded) => {
      if (active) setOrderState(loaded);
    });
    return () => {
      active = false;
    };
  }, [store]);

  const setOrder = useCallback(
    (next: SortOrder) => {
      setOrderState(next);
      // 並び順は UI の好みなので、保存失敗は握りつぶす
      void Promise.resolve(store.save(next)).catch(() => undefined);
    },
    [store],
  );

  return [order, setOrder];
}
