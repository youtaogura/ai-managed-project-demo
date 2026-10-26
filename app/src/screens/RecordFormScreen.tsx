import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { RecordForm } from '../components/RecordForm';
import { colors, space } from '../design/tokens';
import { useRecordRepository } from '../hooks/useRecordRepository';
import type { MediaRecord, NewRecordInput } from '../types/record';

type RecordFormScreenProps = {
  recordId?: string;
  initialValues?: Partial<NewRecordInput>;
};

type LoadState = { status: 'loading' } | { status: 'ready'; record: MediaRecord | null };

export function RecordFormScreen({ recordId, initialValues }: RecordFormScreenProps) {
  const repository = useRecordRepository();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const addedId = useRef<string | null>(null);

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
          const added = await repository.add(input);
          addedId.current = added.id;
        }}
        onSaved={() => {
          if (addedId.current !== null) router.replace(`/records/${addedId.current}`);
        }}
      />
    );
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  const { record } = state;
  if (!record) {
    return (
      <View style={styles.center}>
        <AppText>記録が見つかりません</AppText>
      </View>
    );
  }

  return (
    <RecordForm
      initialValues={record}
      submitLabel="保存する"
      onSubmit={async (input) => {
        const updated = await repository.update(record.id, input);
        if (!updated) throw new Error('not found');
      }}
      onSaved={() => router.back()}
      onDelete={async () => {
        await repository.delete(record.id);
      }}
      onDeleted={() => router.replace('/')}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[5],
    backgroundColor: colors.bg,
  },
});
