import { useFonts } from 'expo-font';

import { fontAssets } from '../design/fonts';

// 読み込みに失敗しても起動できるよう、成功・失敗のどちらでも ready にする
export function useAppFonts(): { ready: boolean } {
  const [loaded, error] = useFonts(fontAssets);
  return { ready: loaded || error !== null };
}
