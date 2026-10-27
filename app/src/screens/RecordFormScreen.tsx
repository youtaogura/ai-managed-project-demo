import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { RecordForm } from '../components/RecordForm';
import { colors, space } from '../design/tokens';
import { useSettings } from '../hooks/useSettings';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { recordHref } from '../lib/recordRoute';
import { spineColorForIndex } from '../lib/spineColor';
import { applyDefaultStatus } from '../lib/statusDefault';
import { todayString } from '../lib/recordForm';
import type { MediaRecord, NewRecordInput } from '../types/record';

type RecordFormScreenProps = {
  recordId?: string;
  initialValues?: Partial<NewRecordInput>;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; record: MediaRecord | null; recordCount: number };

export function RecordFormScreen({ recordId, initialValues }: RecordFormScreenProps) {
  const repository = useRecordRepository();
  const { settings } = useSettings();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const addedRecord = useRef<MediaRecord | null>(null);
  const updatedRecord = useRef<MediaRecord | null>(null);

  useEffect(() => {
    let active = true;
    repository
      .getAll()
      .then((all) => {
        if (active)
          setState({
            status: 'ready',
            record: all.find((r) => r.id === recordId) ?? null,
            recordCount: all.length,
          });
      })
      .catch(() => {
        if (active) setState({ status: 'ready', record: null, recordCount: 0 });
      });
    return () => {
      active = false;
    };
  }, [repository, recordId]);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (recordId === undefined) {
    return (
      <RecordForm
        initialSpineColor={spineColorForIndex(state.recordCount)}
        initialValues={applyDefaultStatus(
          initialValues ?? {},
          settings.defaultStatus,
          todayString(),
        )}
        onSubmit={async (input) => {
          const added = await repository.add(input);
          addedRecord.current = added;
        }}
        onSaved={() => {
          if (addedRecord.current !== null) router.replace(recordHref(addedRecord.current));
        }}
      />
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
      recordId={record.id}
      submitLabel="保存する"
      onSubmit={async (input) => {
        const updated = await repository.update(record.id, input);
        if (!updated) throw new Error('not found');
        updatedRecord.current = updated;
      }}
      onSaved={() => {
        const updated = updatedRecord.current;
        if (updated === null) return;
        const href = recordHref(updated);
        if (href === recordHref(record)) {
          router.dismissTo(href);
        } else {
          // 状態が変わって行き先のパスが変わるときは、旧画面を履歴に残さず本棚から開き直す
          router.dismissTo('/');
          router.push(href);
        }
      }}
      onDelete={async () => {
        await repository.delete(record.id);
      }}
      onDeleted={() => router.dismissTo('/')}
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
