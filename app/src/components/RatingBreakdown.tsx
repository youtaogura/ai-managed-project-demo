import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';

const BAR_HEIGHT = 8;

type RatingBreakdownProps = { buckets: { label: string; count: number }[] };

export function RatingBreakdown({ buckets }: RatingBreakdownProps) {
  const max = Math.max(0, ...buckets.map((b) => b.count));
  return (
    <View style={styles.container}>
      {buckets.map((bucket) => {
        const top = max > 0 && bucket.count === max;
        return (
          <View key={bucket.label} style={styles.row}>
            <AppText variant="label" style={styles.label}>
              {bucket.label}
            </AppText>
            <View style={styles.track}>
              <View
                testID={`rating-bar-${bucket.label}`}
                style={[
                  styles.bar,
                  {
                    width: `${max === 0 ? 0 : (bucket.count / max) * 100}%`,
                    backgroundColor: top ? colors.textPrimary : colors.textTertiary,
                  },
                ]}
              />
            </View>
            <AppText variant="value" style={styles.count}>
              {String(bucket.count)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  label: { width: 64, color: colors.textSecondary },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full },
  count: { width: 28, textAlign: 'right' },
});
