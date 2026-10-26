import { router } from 'expo-router';
import { useState } from 'react';

import type { AddTarget } from '../components/AddSheet';
import { addEntries, firstMediaKind } from '../lib/enabledKinds';
import { useMediaSearch } from './useMediaSearch';
import { useSettings } from './useSettings';

const ADD_ROUTES = {
  scan: '/record/scan',
  search: '/record/search',
  isbn: '/record/isbn',
  mediaSearch: '/record/media-search',
} as const;

// 追加シートの開閉と、選んだ入口への遷移（手入力は onAdd）。
// 入口が「映画等を手で入力する」1 つだけのときは、シートを出さずにすぐフォームを開く
export function useAddSheet(onAdd?: () => void) {
  const { settings } = useSettings();
  const mediaSearchEnabled = useMediaSearch() !== null;
  const enabledKinds = settings.enabledKinds;
  const [addOpen, setAddOpen] = useState(false);
  const closeAdd = () => setAddOpen(false);
  const select = (target: AddTarget) => {
    setAddOpen(false);
    if (target === 'manual') onAdd?.();
    else if (target === 'mediaManual') {
      router.push({
        pathname: '/record/new',
        params: { kind: firstMediaKind(enabledKinds) ?? 'movie' },
      });
    } else router.push(ADD_ROUTES[target]);
  };
  const openAdd = () => {
    const entries = addEntries(enabledKinds, mediaSearchEnabled);
    if (entries.length === 1 && entries[0] === 'mediaManual') select('mediaManual');
    else setAddOpen(true);
  };
  return {
    addOpen,
    openAdd,
    closeAdd,
    select,
    enabledKinds,
    mediaSearchEnabled,
  };
}
