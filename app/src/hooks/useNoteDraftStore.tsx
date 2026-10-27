import { createContext, useContext, type ReactNode } from 'react';

import { createNoteDraftStore, type NoteDraftStore } from '../lib/noteDraftStore';
import { asyncKeyValueStorage } from '../lib/storage';

const defaultStore = createNoteDraftStore(asyncKeyValueStorage);

const NoteDraftStoreContext = createContext<NoteDraftStore>(defaultStore);

type ProviderProps = {
  store?: NoteDraftStore;
  children: ReactNode;
};

export function NoteDraftStoreProvider({ store = defaultStore, children }: ProviderProps) {
  return <NoteDraftStoreContext.Provider value={store}>{children}</NoteDraftStoreContext.Provider>;
}

export function useNoteDraftStore(): NoteDraftStore {
  return useContext(NoteDraftStoreContext);
}
