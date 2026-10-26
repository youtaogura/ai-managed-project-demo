import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

// 上端のセーフエリア（ステータスバー・Dynamic Island 等）の高さ。取得できなければ 0。
// ネイティブヘッダーを使わず、画面内の上部バーを置く画面で上余白に足す。
export function useTopInset(): number {
  return useContext(SafeAreaInsetsContext)?.top ?? 0;
}
