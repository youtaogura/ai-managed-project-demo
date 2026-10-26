import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { createSettingsStore, type SettingsStore } from '../lib/settingsStore';
import { asyncKeyValueStorage } from '../lib/storage';
import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings';

type SettingsValue = {
  settings: AppSettings;
  update(patch: Partial<AppSettings>): void;
  /** 設定全体を置き換える（読み込み用）。保存は呼び出し側が済ませている。 */
  replace(settings: AppSettings): void;
};

const SettingsContext = createContext<SettingsValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined,
  replace: () => undefined,
});

const defaultStore = createSettingsStore(asyncKeyValueStorage);

type ProviderProps = {
  /** 省略時は端末内（AsyncStorage）に保存する。 */
  store?: SettingsStore;
  children: ReactNode;
};

// 読み込みが終わるまで子を描画しない（初期値でちらつかせない）
export function SettingsContextProvider({ store = defaultStore, children }: ProviderProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const current = useRef<AppSettings | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void store
      .load()
      .catch(() => DEFAULT_SETTINGS)
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
    (patch: Partial<AppSettings>) => {
      if (current.current === null) return;
      const next = { ...current.current, ...patch };
      current.current = next;
      setSettings(next);
      // 保存は直列化する。設定は UI の好みなので、失敗は握りつぶす
      queue.current = queue.current.then(() => store.save(next)).catch(() => undefined);
    },
    [store],
  );

  const replace = useCallback((next: AppSettings) => {
    if (current.current === null) return;
    current.current = next;
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({ settings: settings ?? DEFAULT_SETTINGS, update, replace }),
    [settings, update, replace],
  );
  if (settings === null) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
