import { router } from 'expo-router';
import { useState } from 'react';

import type { AddTarget } from '../components/AddSheet';

const ADD_ROUTES = {
  scan: '/record/scan',
  search: '/record/search',
  isbn: '/record/isbn',
  mediaSearch: '/record/media-search',
} as const;

// 追加シートの開閉と、選んだ入口への遷移（手入力は onAdd）
export function useAddSheet(onAdd?: () => void) {
  const [addOpen, setAddOpen] = useState(false);
  const openAdd = () => setAddOpen(true);
  const closeAdd = () => setAddOpen(false);
  const select = (target: AddTarget) => {
    setAddOpen(false);
    if (target === 'manual') onAdd?.();
    else if (target === 'mediaManual') {
      router.push({ pathname: '/record/new', params: { kind: 'movie' } });
    } else router.push(ADD_ROUTES[target]);
  };
  return { addOpen, openAdd, closeAdd, select };
}
