import { useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { triggerRatingHaptic } from '../lib/haptics';
import {
  crossesInteger,
  formatRating,
  parseRating,
  ratingFromPosition,
  stepRating,
} from '../lib/recordForm';
import { AppText } from './AppText';
import { RatingStars } from './RatingStars';

const RATING_INPUT_STAR_SIZE = 38;
const STARS_WIDTH = RATING_INPUT_STAR_SIZE * 5 + 2 * 4;

type RatingInputProps = {
  value: string;
  error?: string;
  onChange: (text: string) => void;
};

export function RatingInput({ value, error, onChange }: RatingInputProps) {
  const parsed = parseRating(value);
  const rating = parsed === null || Number.isNaN(parsed) ? null : parsed;
  const text = rating === null ? '未評価' : formatRating(rating);
  const [width, setWidth] = useState(STARS_WIDTH);
  const drag = useRef({ startX: 0, startPageX: 0 });

  const change = (nextText: string) => {
    if (nextText === value) return;
    const next = parseRating(nextText);
    if (
      rating !== null &&
      next !== null &&
      !Number.isNaN(next) &&
      crossesInteger(rating, next)
    ) {
      triggerRatingHaptic();
    }
    onChange(nextText);
  };

  const update = (x: number) => {
    const next = ratingFromPosition(x, width);
    if (next === null) return;
    change(formatRating(next));
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onGrant = (e: GestureResponderEvent) => {
    drag.current = {
      startX: e.nativeEvent.locationX,
      startPageX: e.nativeEvent.pageX,
    };
    update(e.nativeEvent.locationX);
  };
  const onMove = (e: GestureResponderEvent) => {
    update(drag.current.startX + e.nativeEvent.pageX - drag.current.startPageX);
  };

  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>
        レーティング（1.0〜5.0）
      </AppText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="レーティングを 0.1 下げる"
          onPress={() => change(stepRating(value, -1))}
          style={styles.stepButton}
        >
          <AppText variant="button">−</AppText>
        </Pressable>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="レーティング"
          accessibilityValue={{ text }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName;
            if (name === 'increment') change(stepRating(value, 1));
            if (name === 'decrement') change(stepRating(value, -1));
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
            <RatingStars rating={rating} size={RATING_INPUT_STAR_SIZE} showValue={false} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="レーティングを 0.1 上げる"
          onPress={() => change(stepRating(value, 1))}
          style={styles.stepButton}
        >
          <AppText variant="button">＋</AppText>
        </Pressable>
      </View>
      {rating === null ? (
        <AppText variant="label" style={styles.unrated}>
          未評価
        </AppText>
      ) : (
        <AppText variant="displayNumber" style={styles.number}>
          {text}
        </AppText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="レーティングをクリア"
        disabled={rating === null}
        onPress={() => onChange('')}
        style={[styles.clear, rating === null && styles.clearDisabled]}
      >
        <AppText variant="button">クリア</AppText>
      </Pressable>
      {error ? (
        <AppText variant="micro" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space['2'], alignItems: 'center' },
  label: { color: colors.textSecondary, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  stepButton: {
    width: size.touchMin,
    height: size.touchMin,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { textAlign: 'center' },
  unrated: { color: colors.textSecondary, textAlign: 'center' },
  clear: {
    minHeight: size.touchMin,
    paddingHorizontal: space['4'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDisabled: { opacity: 0.4 },
  error: { color: colors.danger, alignSelf: 'flex-start' },
});
