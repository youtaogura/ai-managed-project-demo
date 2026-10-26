import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import type { RatingBucket } from '../lib/analytics';
import { AppText } from './AppText';

// 1 点台が上（review.png に合わせる）
const BUCKETS: RatingBucket[] = [1, 2, 3, 4, 5];
const BAR_HEIGHT = 8;

type RatingDistributionProps = { distribution: Record<RatingBucket, number> };

export function RatingDistribution({ distribution }: RatingDistributionProps) {
  const max = Math.max(0, ...BUCKETS.map((b) => distribution[b]));
  return (
    <View style={styles.container}>
      {BUCKETS.map((bucket) => {
        const count = distribution[bucket];
        const top = max > 0 && count === max;
        return (
          <View key={bucket} style={styles.row}>
            <AppText variant="label" style={styles.label}>{`${bucket}点台`}</AppText>
            <View style={styles.track}>
              <View
                testID={`rating-bar-${bucket}`}
                style={[
                  styles.bar,
                  {
                    width: `${max === 0 ? 0 : (count / max) * 100}%`,
                    backgroundColor: top ? colors.accent : colors.textTertiary,
                  },
                ]}
              />
            </View>
            <AppText variant="value" style={styles.count}>
              {String(count)}
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
  label: { width: 40, color: colors.textSecondary },
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
