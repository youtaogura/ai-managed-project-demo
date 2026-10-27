import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// 「動きを減らす」がオンかどうか。オンのときは移動・拡大をやめてフェードだけにする
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub?.remove();
    };
  }, []);
  return reduceMotion;
}
