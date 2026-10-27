import type { LayoutAnimationConfig } from 'react-native';

const FADE = { type: 'easeInEaseOut', property: 'opacity' } as const;

/** 棚の並びが変わるときの動き。動きを減らすときは、抜ける・差し込まれる本のフェードだけ */
export function shelfLayoutAnimation(reduceMotion: boolean): LayoutAnimationConfig {
  return reduceMotion
    ? { duration: 220, create: FADE, delete: FADE }
    : { duration: 220, create: FADE, delete: FADE, update: { type: 'spring', springDamping: 0.8 } };
}
