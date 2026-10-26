import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { RecordListItem } from '../components/RecordListItem';
import { SortSelector } from '../components/SortSelector';
import { useRecords } from '../hooks/useRecords';
import { useSortOrder } from '../hooks/useSortOrder';
import { createSortOrderStore, type SortOrderStore } from '../lib/sortOrderStore';
import { sortRecords } from '../lib/sortRecords';
import { asyncKeyValueStorage } from '../lib/storage';
import { colors, spacing } from '../theme';

const defaultSortOrderStore = createSortOrderStore(asyncKeyValueStorage);

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
  const { records, loading } = useRecords();
  const [order, setOrder] = useSortOrder(sortOrderStore);
  const sorted = useMemo(() => sortRecords(records, order), [records, order]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="読み込み中" />
      </View>
    );
  }

  const lookupButtons = (
    <View style={styles.lookupRow}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/record/isbn')}
        style={styles.lookupButton}
      >
        <Text style={styles.addButtonText}>ISBN で探して追加</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/record/scan')}
        style={styles.lookupButton}
      >
        <Text style={styles.addButtonText}>バーコードで読み取って追加</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/record/search')}
        style={styles.lookupButton}
      >
        <Text style={styles.addButtonText}>タイトルで探して追加</Text>
      </Pressable>
    </View>
  );

  if (records.length === 0) {
    return (
      <View style={styles.container}>
        {lookupButtons}
        <EmptyState title="まだ記録がありません" description="記録を追加するとここに表示されます">
          <Pressable accessibilityRole="button" onPress={onAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>記録を追加する</Text>
          </Pressable>
        </EmptyState>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lookupButtons}
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
  lookupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md },
  lookupButton: {
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.tint,
    padding: spacing.sm,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
