import { useScrollToTop } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AddSheet } from '../components/AddSheet';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ScreenContainer } from '../components/ScreenContainer';
import { RibbonMark } from '../components/RibbonMark';
import { Shelf } from '../components/Shelf';
import { ShelfChips } from '../components/ShelfChips';
import { ShelfCreateSheet } from '../components/ShelfCreateSheet';
import { StatusTabs } from '../components/StatusTabs';
import { colors, space } from '../design/tokens';
import { useAddSheet } from '../hooks/useAddSheet';
import { useBottomInset } from '../hooks/useBottomInset';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useRecords } from '../hooks/useRecords';
import { useShelfRepository } from '../hooks/useShelfRepository';
import { useShelves } from '../hooks/useShelves';
import { useSortOrder } from '../hooks/useSortOrder';
import { countByStatus, filterByStatus, type StatusFilter } from '../lib/countByStatus';
import { shelfLayoutAnimation } from '../lib/bookMotion';
import { recordsInShelf } from '../lib/shelfSelectors';
import { createSortOrderStore, type SortOrderStore } from '../lib/sortOrderStore';
import { sortRecords } from '../lib/sortRecords';
import { SHELF_ROW_GAP } from '../lib/spineLayout';
import { asyncKeyValueStorage } from '../lib/storage';
import { countCompletions } from '../lib/yearCounter';
import type { MediaRecord } from '../types/record';

const defaultSortOrderStore = createSortOrderStore(asyncKeyValueStorage);

type RecordsScreenProps = {
  sortOrderStore?: SortOrderStore;
  /** 値が変わると保存された並び順を読み直す（設定で変えたあと本棚に戻ったとき）。 */
  reloadKey?: number;
  onAdd?: () => void;
  onOpen?: (record: MediaRecord) => void;
};

export function RecordsScreen({
  sortOrderStore = defaultSortOrderStore,
  reloadKey,
  onAdd,
  onOpen,
}: RecordsScreenProps) {
  const { records, loading } = useRecords();
  const { shelves, reload: reloadShelves } = useShelves();
  const shelfRepository = useShelfRepository();
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [order] = useSortOrder(sortOrderStore, reloadKey);
  const { addOpen, openAdd, closeAdd, select } = useAddSheet(onAdd);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const reduceMotion = useReduceMotion();
  const listRef = useRef<FlatList<null>>(null);
  useScrollToTop(listRef);

  // 選択中の本棚が消えていたら「すべての本」として扱う
  const shelfId = shelves.some((s) => s.id === selectedShelfId) ? selectedShelfId : null;
  const inShelf = useMemo(() => recordsInShelf(records, shelfId), [records, shelfId]);
  const visible = useMemo(
    () => sortRecords(filterByStatus(inShelf, filter), order),
    [inShelf, filter, order],
  );
  const counts = useMemo(() => countByStatus(inShelf), [inShelf]);
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

  // 本棚・ステータスを切り替えて並びが変わるとき、抜ける・差し込まれる・動く本に動きを付ける
  const animateShelf = () => LayoutAnimation.configureNext(shelfLayoutAnimation(reduceMotion));
  const selectShelf = (id: string | null) => {
    animateShelf();
    setSelectedShelfId(id);
  };
  const changeFilter = (value: StatusFilter) => {
    animateShelf();
    setFilter(value);
  };

  const createShelf = async (name: string) => {
    const shelf = await shelfRepository.create(name);
    await reloadShelves();
    selectShelf(shelf.id);
  };

  const open = (record: MediaRecord) => onOpen?.(record);

  const sheets = (
    <>
      <AddSheet visible={addOpen} onClose={closeAdd} onSelect={select} />
      <ShelfCreateSheet
        visible={createOpen}
        shelves={shelves}
        onSubmit={createShelf}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );

  const heading = (
    <View style={styles.header}>
      <View style={styles.titles}>
        <AppText variant="screenTitle">本棚</AppText>
        <AppText variant="label" style={styles.summary}>
          {records.length === 0
            ? 'まだ本がありません'
            : yearCount > 0
              ? `${records.length} 冊 · 今年読んだ ${yearCount} 冊`
              : `${records.length} 冊`}
        </AppText>
      </View>
      <View style={styles.actions}>
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
          description={"今読んでいる本でも、読み終えた本でも。\n読み終えたら、書き出しの続きを書くだけで記録になります。"}
          onAction={() => openAdd()}
        />
        {sheets}
      </ScreenContainer>
    );
  }

  const header = (
    <View>
      {heading}
      <ShelfChips
        shelves={shelves}
        selectedId={shelfId}
        onSelect={selectShelf}
        onCreateShelf={() => setCreateOpen(true)}
      />
      <View style={styles.tabs}>
        <StatusTabs value={filter} counts={counts} onChange={changeFilter} />
      </View>
      <View style={styles.legend}>
        <RibbonMark />
        <AppText variant="label" style={styles.summary}>
          お気に入り
        </AppText>
      </View>
    </View>
  );

  const shelf =
    visible.length === 0 ? (
      <AppText variant="body" style={styles.none}>
        {inShelf.length === 0 ? 'この本棚にはまだ本がありません' : 'この状態の本はまだありません'}
      </AppText>
    ) : (
      <View style={styles.shelf}>
        <Shelf records={visible} width={width - space[4] * 2} onPressRecord={open} fillEmptyRows />
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
    paddingTop: space[3],
    paddingBottom: space[4],
  },
  titles: { flexShrink: 1, gap: space[1] },
  summary: { color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: space[2] },
  tabs: { marginTop: space[4] },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  shelf: { paddingHorizontal: space[4], paddingTop: space[3], marginBottom: -SHELF_ROW_GAP },
  none: { color: colors.textSecondary, textAlign: 'center', padding: space[6] },
});
