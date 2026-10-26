import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { RecordForm } from '../components/RecordForm';
import { colors, space } from '../design/tokens';
import { useCoverResolver } from '../hooks/useCoverResolver';
import { useSettings } from '../hooks/useSettings';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useShelfRepository } from '../hooks/useShelfRepository';
import { spineColorForIndex } from '../lib/spineColor';
import { applyDefaultStatus } from '../lib/statusDefault';
import { todayString } from '../lib/recordForm';
import { needsCover } from '../lib/coverLookup/needsCover';
import type { MediaRecord, NewRecordInput } from '../types/record';
import type { Shelf } from '../types/shelf';

type RecordFormScreenProps = {
  recordId?: string;
  initialValues?: Partial<NewRecordInput>;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; record: MediaRecord | null; recordCount: number };

export function RecordFormScreen({ recordId, initialValues }: RecordFormScreenProps) {
  const repository = useRecordRepository();
  const shelfRepository = useShelfRepository();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const { settings } = useSettings();
  const resolveCover = useCoverResolver();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const addedId = useRef<string | null>(null);

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

  useEffect(() => {
    let active = true;
    shelfRepository
      .getAll()
      .then((all) => {
        if (active) setShelves(all);
      })
      .catch(() => {
        if (active) setShelves([]);
      });
    return () => {
      active = false;
    };
  }, [shelfRepository]);

  const fillCover = async (input: NewRecordInput): Promise<NewRecordInput> => {
    if (!needsCover(input)) return input;
    try {
      const coverUrl = await resolveCover(input.isbn ?? '');
      return coverUrl === null ? input : { ...input, coverUrl };
    } catch {
      return input;
    }
  };

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
        shelves={shelves}
        initialValues={applyDefaultStatus(
          initialValues ?? {},
          settings.defaultStatus,
          todayString(),
        )}
        onSubmit={async (input) => {
          const added = await repository.add(await fillCover(input));
          addedId.current = added.id;
        }}
        onSaved={() => {
          if (addedId.current !== null) router.replace(`/records/${addedId.current}`);
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
      shelves={shelves}
      submitLabel="保存する"
      onSubmit={async (input) => {
        const updated = await repository.update(record.id, await fillCover(input));
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
