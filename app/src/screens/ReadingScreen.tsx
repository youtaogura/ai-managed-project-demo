import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { MemoRow } from '../components/MemoRow';
import { NoteSheet } from '../components/NoteSheet';
import { Quote } from '../components/Quote';
import { Shelf } from '../components/Shelf';
import { colors, radius, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useShelves } from '../hooks/useShelves';
import { useTopInset } from '../hooks/useTopInset';
import { parseDateParts } from '../lib/date';
import {
  addNote,
  buildNoteItems,
  recordToInput,
  removeNote,
  updateNote,
  type NoteDraft,
  type NoteItem,
} from '../lib/notes';
import { todayString } from '../lib/recordForm';
import { shelfNames } from '../lib/shelfSelectors';
import type { MediaRecord, NewRecordInput } from '../types/record';

const ERROR_FINISH = '保存できませんでした。もう一度お試しください';
const SPINE_SHELF_WIDTH = 96;
const BAR_PADDING = space[4];

type SheetState = { mode: 'new' } | { mode: 'edit'; item: NoteItem } | null;

type ReadingScreenProps = {
  recordId: string;
  onEdit?: (id: string) => void;
  onFinished?: (id: string) => void;
  onBack?: () => void;
};

function startLabel(startDate: string | null): string {
  const parts = startDate ? parseDateParts(startDate) : null;
  return parts ? `読んでる · ${parts.m}/${parts.d} から` : '読んでる';
}

function draftOf(item: NoteItem): NoteDraft {
  const { entry } = item;
  return {
    kind: item.kind,
    page: entry.page ?? '',
    text: entry.text,
    comment: item.kind === 'quote' ? (item.entry.comment ?? '') : '',
  };
}

export function ReadingScreen({ recordId, onEdit, onFinished, onBack }: ReadingScreenProps) {
  const bottomInset = useBottomInset();
  const topInset = useTopInset();
  const repository = useRecordRepository();
  const { shelves } = useShelves();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      repository
        .getAll()
        .catch(() => [] as MediaRecord[])
        .then((all) => {
          if (!active) return;
          setRecord(all.find((r) => r.id === recordId) ?? null);
          setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [repository, recordId]),
  );

  const items = useMemo(() => (record ? buildNoteItems(record) : []), [record]);

  const save = async (input: NewRecordInput | null) => {
    if (!input) throw new Error('invalid');
    const updated = await repository.update(recordId, input);
    if (!updated) throw new Error('not found');
    setRecord(updated);
  };

  const finish = async () => {
    if (!record) return;
    setError(null);
    setFinishing(true);
    try {
      await save({ ...recordToInput(record, record.memos, record.quotes), status: 'completed', endDate: todayString() });
      onFinished?.(recordId);
    } catch {
      setError(ERROR_FINISH);
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center} accessibilityLabel="読み込み中">
        <ActivityIndicator />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.center}>
        <AppText variant="sectionTitle">本が見つかりません</AppText>
        <Button label="本棚へ戻る" onPress={() => onBack?.()} />
      </View>
    );
  }

  const names = shelfNames(record, shelves).join('、');
  const meta = [record.creator, names].filter((v): v is string => !!v).join(' · ');
  const reading = record.status === 'in_progress';
  const editing = sheet?.mode === 'edit' ? sheet.item : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + space[2] }]}>
        <Button variant="icon" accessibilityLabel="戻る" onPress={() => onBack?.()}>
          <AppText variant="sectionTitle">‹</AppText>
        </Button>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="編集"
          style={styles.edit}
          onPress={() => onEdit?.(record.id)}
        >
          <AppText variant="button">編集</AppText>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: (reading ? size.buttonHeight + BAR_PADDING * 2 : 0) + bottomInset + space[6] },
        ]}
      >
        <View style={styles.spine}>
          <Shelf records={[record]} width={SPINE_SHELF_WIDTH} onPressRecord={() => undefined} />
        </View>
        <AppText variant="label" style={{ color: colors.ribbon }}>
          {startLabel(record.startDate)}
        </AppText>
        <AppText variant="bookTitle">{record.title}</AppText>
        {meta ? (
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            {meta}
          </AppText>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.sectionHead}>
          <AppText variant="sectionTitle">メモと引用</AppText>
          <AppText variant="label" style={{ color: colors.textSecondary }}>{`${items.length} 件`}</AppText>
        </View>
        {items.length === 0 ? (
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            まだ何もありません。気づいたことを、ひとこと残してみませんか
          </AppText>
        ) : (
          items.map((item) =>
            item.kind === 'memo' ? (
              <MemoRow key={`memo-${item.entry.id}`} memo={item.entry} onPress={() => setSheet({ mode: 'edit', item })} />
            ) : (
              <Quote key={`quote-${item.entry.id}`} quote={item.entry} onPress={() => setSheet({ mode: 'edit', item })} />
            ),
          )
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="メモ・引用を書く"
          style={styles.add}
          onPress={() => setSheet({ mode: 'new' })}
        >
          <AppText variant="button" style={{ color: colors.textSecondary }}>
            ＋ メモ・引用を書く
          </AppText>
        </Pressable>
      </ScrollView>
      {reading ? (
        <View style={[styles.bar, { paddingBottom: BAR_PADDING + bottomInset }]}>
          {error ? (
            <AppText variant="body" style={{ color: colors.danger }}>
              {error}
            </AppText>
          ) : null}
          <Button label="読み終えた" disabled={finishing} onPress={() => void finish()} />
        </View>
      ) : null}

      <NoteSheet
        visible={sheet !== null}
        bookTitle={record.title}
        recordId={record.id}
        editing={editing ? draftOf(editing) : undefined}
        onSubmit={(draft) =>
          save(
            editing
              ? updateNote(record, { kind: editing.kind, id: editing.entry.id }, draft)
              : addNote(record, draft),
          )
        }
        onDelete={editing ? () => save(removeNote(record, { kind: editing.kind, id: editing.entry.id })) : undefined}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  edit: { minHeight: size.touchMin, minWidth: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space[5], gap: space[3] },
  spine: { alignItems: 'center', paddingTop: space[4], paddingBottom: space[2] },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space[2] },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  add: {
    minHeight: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: radius.button,
    marginTop: space[2],
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space[2],
    paddingTop: BAR_PADDING,
    paddingHorizontal: space[5],
    backgroundColor: colors.bg,
  },
});
