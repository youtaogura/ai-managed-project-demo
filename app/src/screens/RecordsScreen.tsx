import { useScrollToTop } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AddSheet } from '../components/AddSheet';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ScreenContainer } from '../components/ScreenContainer';
import { Shelf } from '../components/Shelf';
import { ShelfChips } from '../components/ShelfChips';
import { SortSheet } from '../components/SortSheet';
import { StatusTabs } from '../components/StatusTabs';
import { colors, radius, space } from '../design/tokens';
import { useAddSheet } from '../hooks/useAddSheet';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecords } from '../hooks/useRecords';
import { useSortOrder } from '../hooks/useSortOrder';
import { countByStatus, filterByStatus, type StatusFilter } from '../lib/countByStatus';
import { createSortOrderStore, type SortOrderStore } from '../lib/sortOrderStore';
import { sortRecords } from '../lib/sortRecords';
import { SHELF_ROW_GAP } from '../lib/spineLayout';
import { asyncKeyValueStorage } from '../lib/storage';
import { countCompletions } from '../lib/yearCounter';
import type { MediaRecord } from '../types/record';

const defaultSortOrderStore = createSortOrderStore(asyncKeyValueStorage);

const RIBBON_MARK_WIDTH = 6;
const RIBBON_MARK_HEIGHT = 12;

type RecordsScreenProps = {
  sortOrderStore?: SortOrderStore;
  onAdd?: () => void;
  onOpen?: (id: string) => void;
  onCreateShelf?: () => void;
};

export function RecordsScreen({
  sortOrderStore = defaultSortOrderStore,
  onAdd,
  onOpen,
  onCreateShelf,
}: RecordsScreenProps) {
  const { records, loading } = useRecords();
  const [order, setOrder] = useSortOrder(sortOrderStore);
  const { addOpen, openAdd, closeAdd, select } = useAddSheet(onAdd);
  const [sortOpen, setSortOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const listRef = useRef<FlatList<null>>(null);
  useScrollToTop(listRef);

  const visible = useMemo(
    () => sortRecords(filterByStatus(records, filter), order),
    [records, filter, order],
  );
  const counts = useMemo(() => countByStatus(records), [records]);
  const yearCount = useMemo(() => countCompletions(records, new Date()).year, [records]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="読み込み中" />
        </View>
      </ScreenContainer>
    );
  }

  const open = (record: MediaRecord) => onOpen?.(record.id);

  const sheets = (
    <>
      <AddSheet visible={addOpen} onClose={closeAdd} onSelect={select} />
      <SortSheet
        visible={sortOpen}
        value={order}
        onClose={() => setSortOpen(false)}
        onChange={setOrder}
      />
    </>
  );

  const heading = (
    <View style={styles.header}>
      <View style={styles.titles}>
        <AppText variant="screenTitle">本棚</AppText>
        {records.length > 0 ? (
          <AppText variant="label" style={styles.summary}>
            {`${records.length} 冊 · 今年読んだ ${yearCount} 冊`}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        {records.length > 0 ? (
          <Button variant="icon" accessibilityLabel="並び替え" onPress={() => setSortOpen(true)}>
            <AppText variant="sectionTitle">⇅</AppText>
          </Button>
        ) : null}
        <Button variant="record" accessibilityLabel="本を追加" onPress={() => openAdd()} />
      </View>
    </View>
  );

  if (records.length === 0) {
    return (
      <ScreenContainer>
        {heading}
        <EmptyState
          title="最初の1冊を、棚に並べよう"
          description="読みたい本も、読んだ本も、ここに並んでいきます"
          onAction={() => openAdd()}
        />
        {sheets}
      </ScreenContainer>
    );
  }

  const header = (
    <View>
      {heading}
      <ShelfChips onCreateShelf={onCreateShelf} />
      <View style={styles.tabs}>
        <StatusTabs value={filter} counts={counts} onChange={setFilter} />
      </View>
      <View style={styles.legend}>
        <View style={styles.ribbonMark} />
        <AppText variant="label" style={styles.summary}>
          お気に入り
        </AppText>
      </View>
    </View>
  );

  const shelf =
    visible.length === 0 ? (
      <AppText variant="body" style={styles.none}>
        この状態の本はまだありません
      </AppText>
    ) : (
      <View style={styles.shelf}>
        <Shelf records={visible} width={width - space[4] * 2} onPressRecord={open} />
      </View>
    );

  return (
    <ScreenContainer>
      <FlatList
        ref={listRef}
        data={[null]}
        keyExtractor={() => 'shelf'}
        ListHeaderComponent={header}
        renderItem={() => shelf}
        contentContainerStyle={{ paddingBottom: space[6] + bottomInset }}
      />
      {sheets}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  titles: { flexShrink: 1 },
  summary: { color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: space[2] },
  tabs: { marginTop: space[3] },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  ribbonMark: {
    width: RIBBON_MARK_WIDTH,
    height: RIBBON_MARK_HEIGHT,
    backgroundColor: colors.ribbon,
    borderRadius: radius.thumb / 2,
  },
  shelf: { paddingHorizontal: space[4], paddingTop: space[3], marginBottom: -SHELF_ROW_GAP },
  none: { color: colors.textSecondary, textAlign: 'center', padding: space[6] },
});
