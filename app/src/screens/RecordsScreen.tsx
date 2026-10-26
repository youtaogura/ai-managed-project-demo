import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { useRecords } from '../hooks/useRecords';
import { getStatusLabel, KIND_LABELS } from '../lib/statusLabel';
import { colors, formColors, spacing } from '../theme';

export function RecordsScreen() {
  const { records, loading } = useRecords();
  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/record/new')}
        style={styles.add}
      >
        <Text style={styles.addText}>追加</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/record/isbn')}
        style={styles.add}
      >
        <Text style={styles.addText}>ISBN で探して追加</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/record/scan')}
        style={styles.add}
      >
        <Text style={styles.addText}>バーコードで読み取って追加</Text>
      </Pressable>
      {sorted.length === 0 ? (
        loading ? null : (
          <EmptyState
            title="まだ記録がありません"
            description="記録を追加するとここに表示されます"
          />
        )
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/record/[id]',
                  params: { id: item.id },
                })
              }
              style={styles.row}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {`${KIND_LABELS[item.kind]} ・ ${getStatusLabel(item.kind, item.status)}`}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  add: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.tint,
  },
  addText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  row: {
    padding: spacing.md,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: formColors.border,
  },
  title: { fontSize: 16, color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
});
