import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';

const BAR_HEIGHT = 8;
const LABEL_WIDTH = 64;
const COUNT_WIDTH = 28;

type Bucket = { label: string; count: number };

type BucketRowProps = { bucket: Bucket; max: number };

function BucketRow({ bucket, max }: BucketRowProps) {
  // いちばん多い区分だけ墨にする（最大が 0 のときは全部 textTertiary）
  const isTop = max > 0 && bucket.count === max;
  const ratio = max > 0 ? bucket.count / max : 0;
  return (
    <View style={styles.row}>
      <AppText variant="label" style={styles.label}>
        {bucket.label}
      </AppText>
      <View style={styles.track}>
        <View
          testID={`rating-bar-${bucket.label}`}
          style={[
            styles.bar,
            {
              width: `${ratio * 100}%`,
              backgroundColor: isTop ? colors.textPrimary : colors.textTertiary,
            },
          ]}
        />
      </View>
      <AppText variant="value" style={styles.count}>
        {String(bucket.count)}
      </AppText>
    </View>
  );
}

type RatingBreakdownProps = { buckets: Bucket[] };

export function RatingBreakdown({ buckets }: RatingBreakdownProps) {
  const max = buckets.reduce((acc, b) => Math.max(acc, b.count), 0);
  return (
    <View style={styles.list}>
      {buckets.map((bucket) => (
        <BucketRow key={bucket.label} bucket={bucket} max={max} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { rowGap: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: space[3] },
  label: { width: LABEL_WIDTH, color: colors.textSecondary },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full },
  count: { width: COUNT_WIDTH, textAlign: 'right' },
});
