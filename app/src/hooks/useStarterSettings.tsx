import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { defaultStarterSettings } from '../lib/starterDefaults';
import { createStarterSettingsStore, type StarterSettingsStore } from '../lib/starterSettingsStore';
import { asyncKeyValueStorage } from '../lib/storage';
import type { StarterSettings } from '../types/starter';

type StarterSettingsValue = {
  starterSettings: StarterSettings;
  update(patch: Partial<StarterSettings>): void;
  /** 全体を置き換える（読み込み用）。保存は呼び出し側が済ませている。 */
  replace(settings: StarterSettings): void;
};

const StarterSettingsContext = createContext<StarterSettingsValue>({
  starterSettings: defaultStarterSettings(),
  update: () => undefined,
  replace: () => undefined,
});

const defaultStore = createStarterSettingsStore(asyncKeyValueStorage);

type ProviderProps = {
  /** 省略時は端末内（AsyncStorage）に保存する。 */
  store?: StarterSettingsStore;
  children: ReactNode;
};

// 読み込みが終わるまで子を描画しない
export function StarterSettingsContextProvider({ store = defaultStore, children }: ProviderProps) {
  const [settings, setSettings] = useState<StarterSettings | null>(null);
  const current = useRef<StarterSettings | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void store
      .load()
      .catch(() => defaultStarterSettings())
      .then((loaded) => {
        if (!active) return;
        current.current = loaded;
        setSettings(loaded);
      });
    return () => {
      active = false;
    };
  }, [store]);

  const update = useCallback(
    (patch: Partial<StarterSettings>) => {
      if (current.current === null) return;
      const next = { ...current.current, ...patch };
      current.current = next;
      setSettings(next);
      queue.current = queue.current.then(() => store.save(next)).catch(() => undefined);
    },
    [store],
  );

  const replace = useCallback((next: StarterSettings) => {
    if (current.current === null) return;
    current.current = next;
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({
      starterSettings: settings ?? defaultStarterSettings(),
      update,
      replace,
    }),
    [settings, update, replace],
  );
  if (settings === null) return null;
  return <StarterSettingsContext.Provider value={value}>{children}</StarterSettingsContext.Provider>;
}

export function useStarterSettings(): StarterSettingsValue {
  return useContext(StarterSettingsContext);
}
