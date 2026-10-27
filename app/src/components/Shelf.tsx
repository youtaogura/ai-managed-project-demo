import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, size } from '../design/tokens';
import { layoutShelfRows, padShelfRows, SHELF_ROW_GAP, SPINE_GAP } from '../lib/spineLayout';
import type { MediaRecord } from '../types/record';
import { Spine } from './Spine';

type ShelfProps = {
  records: readonly MediaRecord[];
  width: number;
  onPressRecord: (record: MediaRecord) => void;
  /** true のとき空の段を並べる（最低 3 段、一番下がいっぱいなら 1 段足す） */
  fillEmptyRows?: boolean;
};

export function Shelf({ records, width, onPressRecord, fillEmptyRows = false }: ShelfProps) {
  const laidOut = layoutShelfRows(records, width);
  const rows = fillEmptyRows ? padShelfRows(laidOut, width) : laidOut;
  return (
    <View style={{ width }}>
      {rows.map((row, i) => (
        <View key={row[0]?.id ?? `empty-${i}`} style={styles.row}>
          <View style={row.length === 0 ? [styles.books, styles.emptyBooks] : styles.books}>
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
  emptyBooks: { minHeight: size.spineHeightMin },
  board: {
    height: size.shelfBoardHeight,
    backgroundColor: colors.shelfBoard,
    borderRadius: radius.thumb,
    boxShadow: shadows.cover,
  },
});
