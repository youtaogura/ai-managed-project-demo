import { useRef, useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, View } from 'react-native';

import { triggerRatingHaptic } from '../lib/haptics';
import { crossesInteger, formatRating, ratingFromPosition } from '../lib/recordForm';
import { RatingStars } from './RatingStars';

const STAR_SIZE = 34;
const STAR_GAP = 2;
const STARS_WIDTH = STAR_SIZE * 5 + STAR_GAP * 4;
const MIN = 1;
const MAX = 5;

type RatingSliderProps = {
  value: number | null;
  onChange: (value: number) => void;
};

function step(value: number | null, delta: 1 | -1): number {
  if (value === null) return delta > 0 ? 3 : MIN;
  return Math.min(MAX, Math.max(MIN, Math.round(value * 10 + delta) / 10));
}

/** 星をなぞって 1.0〜5.0 を 0.1 刻みで選ぶ。数字と言葉は呼び出し側で出す。 */
export function RatingSlider({ value, onChange }: RatingSliderProps) {
  const [width, setWidth] = useState(STARS_WIDTH);
  const drag = useRef({ startX: 0, startPageX: 0 });

  const change = (next: number) => {
    if (next === value) return;
    if (value !== null && crossesInteger(value, next)) triggerRatingHaptic();
    onChange(next);
  };

  const update = (x: number) => {
    const next = ratingFromPosition(x, width);
    if (next !== null) change(next);
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onGrant = (e: GestureResponderEvent) => {
    drag.current = { startX: e.nativeEvent.locationX, startPageX: e.nativeEvent.pageX };
    update(e.nativeEvent.locationX);
  };
  const onMove = (e: GestureResponderEvent) => {
    update(drag.current.startX + e.nativeEvent.pageX - drag.current.startPageX);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="どうだった？"
      accessibilityValue={{ text: value === null ? '未選択' : formatRating(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'increment') change(step(value, 1));
        if (name === 'decrement') change(step(value, -1));
      }}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onMove}
      style={{ width: STARS_WIDTH }}
    >
      <View pointerEvents="none">
        <RatingStars rating={value} size={STAR_SIZE} showValue={false} />
      </View>
    </View>
  );
}
