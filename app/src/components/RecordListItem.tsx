import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPeriod, formatRating } from '../lib/format';
import { getStatusLabel, KIND_LABELS } from '../lib/statusLabel';
import { colors, spacing } from '../theme';
import type { MediaRecord } from '../types/record';
import { Thumbnail } from './Thumbnail';

type RecordListItemProps = {
  record: MediaRecord;
  onPress: (record: MediaRecord) => void;
};

export function RecordListItem({ record, onPress }: RecordListItemProps) {
  const period = formatPeriod(record.startDate, record.endDate);
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(record)} style={styles.row}>
      <Thumbnail record={record} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {record.title}
        </Text>
        <Text style={styles.meta}>
          {KIND_LABELS[record.kind]} ・ {getStatusLabel(record.kind, record.status)}
        </Text>
        {period ? <Text style={styles.meta}>{period}</Text> : null}
        <Text style={styles.rating}>{formatRating(record.rating)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  rating: { fontSize: 13, color: colors.text },
});
