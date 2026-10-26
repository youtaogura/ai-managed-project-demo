import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RecordForm } from '../components/RecordForm';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { colors, spacing } from '../theme';
import type { MediaRecord, NewRecordInput } from '../types/record';

type RecordFormScreenProps = {
  recordId?: string;
  initialValues?: Partial<NewRecordInput>;
};

type LoadState = { status: 'loading' } | { status: 'ready'; record: MediaRecord | null };

export function RecordFormScreen({ recordId, initialValues }: RecordFormScreenProps) {
  const repository = useRecordRepository();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (recordId === undefined) return;
    let active = true;
    repository
      .getAll()
      .then((all) => {
        if (active)
          setState({
            status: 'ready',
            record: all.find((r) => r.id === recordId) ?? null,
          });
      })
      .catch(() => {
        if (active) setState({ status: 'ready', record: null });
      });
    return () => {
      active = false;
    };
  }, [repository, recordId]);

  if (recordId === undefined) {
    return (
      <RecordForm
        initialValues={initialValues}
        onSubmit={async (input) => {
          await repository.add(input);
          router.back();
        }}
      />
    );
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const { record } = state;
  if (!record) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>記録が見つかりません</Text>
      </View>
    );
  }

  return (
    <RecordForm
      initialValues={record}
      onSubmit={async (input) => {
        const updated = await repository.update(record.id, input);
        if (!updated) throw new Error('not found');
        router.back();
      }}
      onDelete={async () => {
        await repository.delete(record.id);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  text: { fontSize: 16, color: colors.text },
});
