import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { RecordListItem } from '../components/RecordListItem';
import { SortSelector } from '../components/SortSelector';
import { useRecords } from '../hooks/useRecords';
import { useSortOrder } from '../hooks/useSortOrder';
import { recordRepository } from '../lib/repository';
import type { RecordRepository } from '../lib/recordRepository';
import { createSortOrderStore, type SortOrderStore } from '../lib/sortOrderStore';
import { sortRecords } from '../lib/sortRecords';
import { asyncKeyValueStorage } from '../lib/storage';
import { colors, spacing } from '../theme';

const defaultSortOrderStore = createSortOrderStore(asyncKeyValueStorage);

type RecordsScreenProps = {
  repository?: RecordRepository;
  sortOrderStore?: SortOrderStore;
  onAdd?: () => void;
  onOpen?: (id: string) => void;
};

export function RecordsScreen({
  repository = recordRepository,
  sortOrderStore = defaultSortOrderStore,
  onAdd,
  onOpen,
}: RecordsScreenProps) {
  const { records, loading } = useRecords(repository);
  const [order, setOrder] = useSortOrder(sortOrderStore);
  const sorted = useMemo(() => sortRecords(records, order), [records, order]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="読み込み中" />
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState title="まだ記録がありません" description="記録を追加するとここに表示されます">
        <Pressable accessibilityRole="button" onPress={onAdd} style={styles.addButton}>
          <Text style={styles.addButtonText}>記録を追加する</Text>
        </Pressable>
      </EmptyState>
    );
  }

  return (
    <View style={styles.container}>
      <SortSelector value={order} onChange={setOrder} />
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordListItem record={item} onPress={(record) => onOpen?.(record.id)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
});
