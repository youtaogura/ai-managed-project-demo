import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

// 下端のセーフエリア（ホームインジケータ等）の高さ。取得できなければ 0。
// タブバーのない画面でコンテンツ末尾の余白に足す。
export function useBottomInset(): number {
  return useContext(SafeAreaInsetsContext)?.bottom ?? 0;
}
