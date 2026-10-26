import { useCallback, useEffect, useState } from 'react';

import type { ExportStore } from '../lib/exportStore';

export function useLastExportedAt(store: ExportStore, reloadKey = 0) {
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void store.loadLastExportedAt().then((loaded) => {
      if (active) setLastExportedAt(loaded);
    });
    return () => {
      active = false;
    };
  }, [store, reloadKey]);

  const markExported = useCallback(
    async (iso: string) => {
      setLastExportedAt(iso);
      // 表示は更新済み。保存に失敗しても書き出し自体は成功している
      await Promise.resolve(store.saveLastExportedAt(iso)).catch(() => undefined);
    },
    [store],
  );

  return { lastExportedAt, markExported };
}
