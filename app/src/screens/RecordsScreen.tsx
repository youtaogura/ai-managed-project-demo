import { useScrollToTop } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AddSheet } from '../components/AddSheet';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CoverCard } from '../components/CoverCard';
import { EmptyState } from '../components/EmptyState';
import { ScreenContainer } from '../components/ScreenContainer';
import { SortSheet } from '../components/SortSheet';
import { YearCounter } from '../components/YearCounter';
import { colors, space } from '../design/tokens';
import { useAddSheet } from '../hooks/useAddSheet';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSettings } from '../hooks/useSettings';
import { useRecords } from '../hooks/useRecords';
import { useSortOrder } from '../hooks/useSortOrder';
import { filterRecordsByKinds } from '../lib/enabledKinds';
import { createSortOrderStore, type SortOrderStore } from '../lib/sortOrderStore';
import { SORT_ORDER_LABELS, sortRecords } from '../lib/sortRecords';
import { asyncKeyValueStorage } from '../lib/storage';
import { countCompletions, recentlyFinished } from '../lib/yearCounter';
import type { MediaRecord } from '../types/record';

const defaultSortOrderStore = createSortOrderStore(asyncKeyValueStorage);

const COLUMNS = 4;
const GRID_GAP = 10;
const RECENT_LIMIT = 10;

type RecordsScreenProps = {
  sortOrderStore?: SortOrderStore;
  onAdd?: () => void;
  onOpen?: (id: string) => void;
};

export function RecordsScreen({
  sortOrderStore = defaultSortOrderStore,
  onAdd,
  onOpen,
}: RecordsScreenProps) {
  const { records: allRecords, loading } = useRecords();
  const { settings } = useSettings();
  const [order, setOrder] = useSortOrder(sortOrderStore);
  const { addOpen, openAdd, closeAdd, select, enabledKinds, mediaSearchEnabled } =
    useAddSheet(onAdd);
  const [sortOpen, setSortOpen] = useState(false);
  const { width } = useWindowDimensions();
  const bottomInset = useBottomInset();
  const listRef = useRef<FlatList<MediaRecord>>(null);
  useScrollToTop(listRef);

  const records = useMemo(
    () => filterRecordsByKinds(allRecords, settings.enabledKinds),
    [allRecords, settings.enabledKinds],
  );
  const sorted = useMemo(() => sortRecords(records, order), [records, order]);
  const recent = useMemo(() => recentlyFinished(records, RECENT_LIMIT), [records]);
  const counts = useMemo(() => countCompletions(records, new Date()), [records]);

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
  const cellWidth = (width - space[5] * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  const sheets = (
    <>
      <AddSheet
        visible={addOpen}
        onClose={closeAdd}
        onSelect={select}
        mediaSearchEnabled={mediaSearchEnabled}
        enabledKinds={enabledKinds}
      />
      <SortSheet
        visible={sortOpen}
        value={order}
        onClose={() => setSortOpen(false)}
        onChange={setOrder}
      />
    </>
  );

  if (records.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <AppText variant="screenTitle">記録</AppText>
        </View>
        <EmptyState
          title="最初の1作品を記録しよう"
          description="読み終えた本や、見終えた映画を記録するとここに並んでいきます"
          onAction={() => openAdd()}
        />
        {sheets}
      </ScreenContainer>
    );
  }

  const header = (
    <View>
      <View style={styles.header}>
        <AppText variant="screenTitle">記録</AppText>
        <View style={styles.actions}>
          <Button variant="icon" accessibilityLabel="並び替え" onPress={() => setSortOpen(true)}>
            <AppText variant="sectionTitle">⇅</AppText>
          </Button>
          <Button variant="record" onPress={() => openAdd()} />
        </View>
      </View>
      <View style={styles.counter}>
        <YearCounter year={counts.year} month={counts.month} />
      </View>
      {recent.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="sectionTitle" style={styles.sectionTitle}>
            最近読み終えた・見終えた
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hero}
          >
            {recent.map((record) => (
              <CoverCard key={record.id} record={record} variant="hero" onPress={open} />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={[styles.sectionTitleRow, styles.section]}>
        <AppText variant="sectionTitle">すべての記録</AppText>
        <AppText variant="label" style={styles.order}>
          {SORT_ORDER_LABELS[order]}
        </AppText>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        ref={listRef}
        data={sorted}
        numColumns={COLUMNS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={{ paddingBottom: space[6] + bottomInset }}
        renderItem={({ item }) => (
          <CoverCard record={item} variant="thumb" width={cellWidth} onPress={open} />
        )}
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
  actions: { flexDirection: 'row', gap: space[2] },
  counter: { paddingHorizontal: space[5], marginBottom: space[5] },
  section: { marginBottom: space[3] },
  sectionTitle: { paddingHorizontal: space[5], marginBottom: space[3] },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
  },
  order: { color: colors.textSecondary },
  hero: { paddingHorizontal: space[5], gap: space[3], marginBottom: space[5] },
  gridRow: {
    paddingHorizontal: space[5],
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
});
