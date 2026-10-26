import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, size } from '../design/tokens';
import { layoutShelfRows, SHELF_ROW_GAP, SPINE_GAP } from '../lib/spineLayout';
import type { MediaRecord } from '../types/record';
import { Spine } from './Spine';

type ShelfProps = {
  records: readonly MediaRecord[];
  width: number;
  onPressRecord: (record: MediaRecord) => void;
};

export function Shelf({ records, width, onPressRecord }: ShelfProps) {
  const rows = layoutShelfRows(records, width);
  return (
    <View style={{ width }}>
      {rows.map((row, i) => (
        <View key={row[0]?.id ?? i} style={styles.row}>
          <View style={styles.books}>
            {row.map((record) => (
              <Spine key={record.id} record={record} onPress={onPressRecord} />
            ))}
          </View>
          <View testID="shelf-board" style={styles.board} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: SHELF_ROW_GAP },
  books: { flexDirection: 'row', alignItems: 'flex-end', gap: SPINE_GAP },
  board: {
    height: size.shelfBoardHeight,
    backgroundColor: colors.shelfBoard,
    borderRadius: radius.thumb,
    boxShadow: shadows.cover,
  },
});
