import type { router as expoRouter } from 'expo-router';

type BackRouter = Pick<typeof expoRouter, 'canGoBack' | 'back' | 'dismissTo'>;

// 本棚へ「戻る」動きにする。履歴があれば一つ前へ、なければ（直接開いたとき）本棚まで戻る
export function goBackOrHome(router: BackRouter): void {
  if (router.canGoBack()) router.back();
  else router.dismissTo('/');
}
