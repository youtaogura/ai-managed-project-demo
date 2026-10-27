import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, size } from '../design/tokens';
import { layoutShelfRows, padShelfRows, SHELF_ROW_GAP, SPINE_GAP } from '../lib/spineLayout';
import { useBookFlight, useBookFlightState, type ViewHandle } from '../hooks/useBookFlight';
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
              <ShelfSpine key={record.id} record={record} onPress={onPressRecord} />
            ))}
          </View>
          <View testID="shelf-board" style={styles.board} />
        </View>
      ))}
    </View>
  );
}

// 背表紙を押すと、取り出す動きを始めて（位置を測る）、画面遷移を続ける。動いている間は棚側を隠す
function ShelfSpine({ record, onPress }: { record: MediaRecord; onPress: (record: MediaRecord) => void }) {
  const ref = useRef<ViewHandle>(null);
  const { registerSource, open } = useBookFlight();
  const flight = useBookFlightState();
  useEffect(() => registerSource(record, ref), [registerSource, record]);
  const press = (r: MediaRecord) => {
    // 取り出す動きは、背表紙のある「読んでる本」の画面へ開くときだけ（読み返す画面には背表紙がない）
    if (r.status === 'in_progress') ref.current?.measureInWindow((x, y, width, height) => {
      if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
        open(r, { x, y, width, height });
      }
    });
    onPress(r);
  };
  return (
    <View ref={ref} collapsable={false} style={flight?.record.id === record.id ? styles.hidden : undefined}>
      <Spine record={record} onPress={press} />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
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
