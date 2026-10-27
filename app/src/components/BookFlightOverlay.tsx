import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { computeFlightFrames, FLIGHT_DURATION_MS, type Rect } from '../lib/bookMotion';
import type { MediaRecord } from '../types/record';
import { Spine } from './Spine';

export type Flight = {
  key: number;
  record: MediaRecord;
  from: Rect;
  to: Rect;
  /** open は棚から取り出す（持ち上げる）、close は棚へ戻す */
  direction: 'open' | 'close';
  reduceMotion: boolean;
};

type BookFlightOverlayProps = {
  flight: Flight | null;
  onDone: (key: number) => void;
};

// 棚の背表紙を複製して、画面の上で動かす。操作は受け付けない
export function BookFlightOverlay({ flight, onDone }: BookFlightOverlayProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!flight) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: FLIGHT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone(flight.key);
    });
    return () => anim.stop();
  }, [flight, progress, onDone]);

  if (!flight) return null;
  const { record, from, to, direction, reduceMotion } = flight;

  if (reduceMotion) {
    return (
      <Animated.View
        testID="book-flight"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.layer, { left: to.x, top: to.y, width: to.width, height: to.height, opacity: progress }]}
      >
        <Spine record={record} dimensions={{ width: to.width, height: to.height }} />
      </Animated.View>
    );
  }

  const frames = computeFlightFrames(from, to, direction === 'open');
  const at = (values: number[]) => progress.interpolate({ inputRange: frames.inputRange, outputRange: values });
  return (
    <Animated.View
      testID="book-flight"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.layer,
        {
          left: from.x,
          top: from.y,
          width: from.width,
          height: from.height,
          transformOrigin: 'top left',
          transform: [
            { translateX: at(frames.translateX) },
            { translateY: at(frames.translateY) },
            { scaleX: at(frames.scaleX) },
            { scaleY: at(frames.scaleY) },
          ],
        },
      ]}
    >
      <Spine record={record} dimensions={{ width: from.width, height: from.height }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
});
