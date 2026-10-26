import { useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatRating,
  parseRating,
  ratingFromPosition,
  starFills,
  stepRating,
} from '../lib/recordForm';
import { STAR_SIZE, colors, formColors, spacing } from '../theme';
import { StarRating } from './StarRating';

type RatingInputProps = {
  value: string;
  error?: string;
  onChange: (text: string) => void;
};

export function RatingInput({ value, error, onChange }: RatingInputProps) {
  const parsed = parseRating(value);
  const rating = parsed === null || Number.isNaN(parsed) ? null : parsed;
  const text = rating === null ? '未評価' : formatRating(rating);
  const [width, setWidth] = useState(STAR_SIZE * 5);
  const drag = useRef({ startX: 0, startPageX: 0 });

  const update = (x: number) => {
    const next = ratingFromPosition(x, width);
    if (next === null) return;
    const formatted = formatRating(next);
    if (formatted === value) return;
    onChange(formatted);
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
      <Text style={styles.label}>レーティング（1.0〜5.0）</Text>
      <View style={styles.row}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="レーティング"
          accessibilityValue={{ text }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName;
            if (name === 'increment') onChange(stepRating(value, 1));
            if (name === 'decrement') onChange(stepRating(value, -1));
          }}
          onLayout={onLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onMove}
          style={{ width: STAR_SIZE * 5 }}
        >
          <StarRating fills={starFills(rating)} size={STAR_SIZE} />
        </View>
        <Text style={styles.value}>{text}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="レーティングをクリア"
          onPress={() => onChange('')}
          style={styles.clear}
        >
          <Text style={styles.clearText}>クリア</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: {
    fontSize: 16,
    color: colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
  clear: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  clearText: { color: colors.tint, fontSize: 14 },
  error: { color: formColors.danger, fontSize: 13 },
});
