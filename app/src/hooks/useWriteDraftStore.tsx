import { createContext, useContext, type ReactNode } from 'react';

import { asyncKeyValueStorage } from '../lib/storage';
import { createWriteDraftStore, type WriteDraftStore } from '../lib/writeDraftStore';

const defaultStore = createWriteDraftStore(asyncKeyValueStorage);

const WriteDraftStoreContext = createContext<WriteDraftStore>(defaultStore);

type ProviderProps = {
  store?: WriteDraftStore;
  children: ReactNode;
};

export function WriteDraftStoreProvider({ store = defaultStore, children }: ProviderProps) {
  return <WriteDraftStoreContext.Provider value={store}>{children}</WriteDraftStoreContext.Provider>;
}

export function useWriteDraftStore(): WriteDraftStore {
  return useContext(WriteDraftStoreContext);
}
