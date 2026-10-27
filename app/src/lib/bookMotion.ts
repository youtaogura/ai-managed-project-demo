import type { LayoutAnimationConfig } from 'react-native';

export type Rect = { x: number; y: number; width: number; height: number };

/** 背表紙を取り出す動きの総時間。300ms 以内（動きを待たせない） */
export const FLIGHT_DURATION_MS = 280;
/** 取り出すとき、背表紙が持ち上がる量（押下の 4px より大きく） */
export const LIFT_PX = 12;
export const LIFT_SCALE = 1.08;
/** 動き全体のうち、持ち上げに使う割合 */
export const LIFT_RATIO = 0.35;

export type FlightFrames = {
  inputRange: number[];
  translateX: number[];
  translateY: number[];
  scaleX: number[];
  scaleY: number[];
};

/**
 * 背表紙を from の矩形から to の矩形へ運ぶキーフレーム（左上を原点にした transform）。
 * lift が true のときは先に持ち上げ・拡大してから運ぶ（取り出す）。false なら一直線に運ぶ（戻す）
 */
export function computeFlightFrames(from: Rect, to: Rect, lift = true): FlightFrames {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const sx = from.width > 0 ? to.width / from.width : 1;
  const sy = from.height > 0 ? to.height / from.height : 1;
  if (!lift) {
    return {
      inputRange: [0, 1],
      translateX: [0, dx],
      translateY: [0, dy],
      scaleX: [1, sx],
      scaleY: [1, sy],
    };
  }
  return {
    inputRange: [0, LIFT_RATIO, 1],
    translateX: [0, 0, dx],
    translateY: [0, -LIFT_PX, dy],
    scaleX: [1, LIFT_SCALE, sx],
    scaleY: [1, LIFT_SCALE, sy],
  };
}

const FADE = { type: 'easeInEaseOut', property: 'opacity' } as const;

/** 棚の並びが変わるときの動き。動きを減らすときは、抜ける・差し込まれる本のフェードだけ */
export function shelfLayoutAnimation(reduceMotion: boolean): LayoutAnimationConfig {
  return reduceMotion
    ? { duration: 220, create: FADE, delete: FADE }
    : { duration: 220, create: FADE, delete: FADE, update: { type: 'spring', springDamping: 0.8 } };
}
