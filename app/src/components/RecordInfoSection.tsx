import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { buildInfoRows } from '../lib/recordInfo';
import type { MediaRecord } from '../types/record';
import { AppText } from './AppText';
import { Button } from './Button';
import { Cover } from './Cover';

const MINI_COVER_WIDTH = 56;

type RecordInfoSectionProps = {
  record: MediaRecord;
  onDelete: () => void;
};

export function RecordInfoSection({ record, onDelete }: RecordInfoSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Cover record={record} width={MINI_COVER_WIDTH} radius={radius.thumb} />
        <AppText variant="sectionTitle" style={styles.title}>
          {record.title}
        </AppText>
      </View>
      <View style={styles.rows}>
        <AppText variant="sectionTitle">作品の情報</AppText>
        {buildInfoRows(record).map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText variant="label" style={{ color: colors.textSecondary }}>
              {row.label}
            </AppText>
            <AppText variant="value" style={styles.rowValue}>
              {row.value}
            </AppText>
          </View>
        ))}
      </View>
      <Button variant="outline" tone="danger" label="この記録を削除" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[5] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  title: { flex: 1 },
  rows: { gap: space[3] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[4],
    paddingBottom: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowValue: { flex: 1, textAlign: 'right' },
});
