import { useCallback, useEffect, useState } from 'react';

import type { SortOrderStore } from '../lib/sortOrderStore';
import { DEFAULT_SORT_ORDER, type SortOrder } from '../types/sort';

/** reloadKey が変わると保存された並び順を読み直す（タブに戻ったときなど）。 */
export function useSortOrder(
  store: SortOrderStore,
  reloadKey?: number,
): [SortOrder, (order: SortOrder) => void] {
  const [order, setOrderState] = useState<SortOrder>(DEFAULT_SORT_ORDER);

  useEffect(() => {
    let active = true;
    void store.load().then((loaded) => {
      if (active) setOrderState(loaded);
    });
    return () => {
      active = false;
    };
  }, [store, reloadKey]);

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
