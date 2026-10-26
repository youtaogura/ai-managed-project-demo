import { StyleSheet, Text, View } from 'react-native';

import type { RatingBucket } from '../lib/analytics';
import { colors, spacing } from '../theme';

const BUCKETS: RatingBucket[] = [5, 4, 3, 2, 1];

type RatingDistributionProps = { distribution: Record<RatingBucket, number> };

export function RatingDistribution({ distribution }: RatingDistributionProps) {
  const max = Math.max(0, ...BUCKETS.map((b) => distribution[b]));
  return (
    <View style={styles.container}>
      {BUCKETS.map((bucket) => (
        <View key={bucket} style={styles.row}>
          <Text style={styles.label}>{`${bucket}点台`}</Text>
          <View style={styles.track}>
            <View
              style={[styles.bar, { width: `${max === 0 ? 0 : (distribution[bucket] / max) * 100}%` }]}
            />
          </View>
          <Text style={styles.count}>{`${distribution[bucket]}件`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 48, fontSize: 14, color: colors.text },
  track: { flex: 1, height: 14, backgroundColor: colors.surface, borderRadius: 3 },
  bar: { height: 14, backgroundColor: colors.tint, borderRadius: 3 },
  count: { width: 40, fontSize: 14, color: colors.text, textAlign: 'right' },
});
