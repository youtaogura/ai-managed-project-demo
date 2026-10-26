import { DEFAULT_SORT_ORDER, isSortOrder, type SortOrder } from '../types/sort';
import type { KeyValueStorage } from './storage';

export const SORT_ORDER_STORAGE_KEY = 'listSortOrder.v1';

export type SortOrderStore = {
  load(): Promise<SortOrder>;
  save(order: SortOrder): Promise<void>;
};

export function createSortOrderStore(storage: KeyValueStorage): SortOrderStore {
  return {
    load: async () => {
      try {
        const raw = await storage.getItem(SORT_ORDER_STORAGE_KEY);
        return isSortOrder(raw) ? raw : DEFAULT_SORT_ORDER;
      } catch {
        return DEFAULT_SORT_ORDER;
      }
    },
    save: (order) => storage.setItem(SORT_ORDER_STORAGE_KEY, order),
  };
}
