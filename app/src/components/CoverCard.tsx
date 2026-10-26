import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { getStatusLabel } from '../lib/statusLabel';
import type { MediaRecord } from '../types/record';
import { AppText } from './AppText';
import { Cover } from './Cover';

type CoverCardProps = {
  record: MediaRecord;
  onPress: (record: MediaRecord) => void;
} & ({ variant: 'hero'; width?: undefined } | { variant: 'thumb'; width: number });

const PRESS_SCALE = 0.97;
const PRESS_DURATION = 100;
const DOT_SIZE = 8;

export function CoverCard({ record, variant, width, onPress }: CoverCardProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const animateTo = (toValue: number) =>
    Animated.timing(scale, { toValue, duration: PRESS_DURATION, useNativeDriver: true }).start();

  const cardWidth = variant === 'hero' ? size.heroCardWidth : width;
  const cardRadius = variant === 'hero' ? radius.card : radius.thumb;
  const showRating = variant === 'hero' && record.rating !== null;
  const showEndDate = variant === 'hero' && record.endDate !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={record.title}
      onPress={() => onPress(record)}
      onPressIn={() => animateTo(PRESS_SCALE)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View testID="cover-card-body" style={{ width: cardWidth, transform: [{ scale }] }}>
        <View>
          <Cover record={record} width={cardWidth} radius={cardRadius} />
          {record.status === 'in_progress' ? (
            <View
              testID="status-dot"
              accessible
              accessibilityLabel={getStatusLabel(record.kind, record.status)}
              style={styles.dot}
            />
          ) : null}
        </View>
        {showRating || showEndDate ? (
          <View style={styles.info}>
            {record.rating !== null ? (
              <AppText variant="value">{`★ ${record.rating.toFixed(1)}`}</AppText>
            ) : null}
            {record.endDate !== null ? (
              <AppText variant="label" style={styles.endDate}>
                {record.endDate}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: space['2'],
    left: space['2'],
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.accent,
  },
  info: { marginTop: space['1'], gap: space['1'] },
  endDate: { color: colors.textSecondary },
});
