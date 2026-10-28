import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { BookHero } from '../components/BookHero';
import { Button } from '../components/Button';
import { MemoRow } from '../components/MemoRow';
import { NoteSheet } from '../components/NoteSheet';
import { Quote } from '../components/Quote';
import { RatingStars } from '../components/RatingStars';
import { RuledText } from '../components/RuledText';
import { SettingsRow } from '../components/SettingsRow';
import { ShelfPickSheet } from '../components/ShelfPickSheet';
import { StarterText } from '../components/StarterText';
import { regularTextStyle } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useShelfPick } from '../hooks/useShelfPick';
import { useTopInset } from '../hooks/useTopInset';
import { triggerImpactHaptic } from '../lib/haptics';
import {
  addNote,
  buildNoteItems,
  noteItemToDraft,
  recordToInput,
  removeNote,
  updateNote,
  type NoteItem,
} from '../lib/notes';
import { getRatingWord } from '../lib/ratingWord';
import { buildRereadEntries, hasRereadContent } from '../lib/reread';
import { formatRating, todayString } from '../lib/recordForm';
import { shelfNames } from '../lib/shelfSelectors';
import type { MediaRecord, NewRecordInput } from '../types/record';

const STARS_SIZE = 18;
const ERROR_START = '保存できませんでした。もう一度お試しください';

const START_ACTIONS = {
  planned: {
    guide: '読み始めると、読んでる本の画面に移って、読みながらメモや引用を残せます',
    label: '読み始める',
  },
  dropped: {
    guide: 'もう一度読み始めると、読んでる本の画面に移ります',
    label: 'もう一度読む',
  },
} as const;

type SheetState = { mode: 'new' } | { mode: 'edit'; item: NoteItem } | null;

type RereadScreenProps = {
  recordId: string;
  onEdit?: (id: string) => void;
  onWrite?: (id: string) => void;
  onStart?: (id: string) => void;
  onBack?: () => void;
};

export function RereadScreen({ recordId, onEdit, onWrite, onStart, onBack }: RereadScreenProps) {
  const bottomInset = useBottomInset();
  const topInset = useTopInset();
  const repository = useRecordRepository();
  const { shelves, counts, create: createShelf } = useShelfPick();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);

  // 書く画面から戻ったときに最新の内容を表示するため、フォーカスのたび読み込む
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

  const entries = useMemo(() => (record ? buildRereadEntries(record) : []), [record]);
  const noteItems = useMemo(
    () =>
      record
        ? buildNoteItems({
            memos: record.memos.filter((m) => m.text.trim() !== ''),
            quotes: record.quotes.filter((q) => q.text.trim() !== ''),
          })
        : [],
    [record],
  );

  const save = async (input: NewRecordInput | null) => {
    if (!input) throw new Error('invalid');
    const updated = await repository.update(recordId, input);
    if (!updated) throw new Error('not found');
    setRecord(updated);
  };

  const saveShelves = async (shelfIds: string[]) => {
    if (!record) return;
    const updated = await repository.update(recordId, {
      ...recordToInput(record, record.memos, record.quotes),
      shelfIds,
    });
    if (!updated) throw new Error('not found');
    setRecord(updated);
  };

  const start = async () => {
    if (!record) return;
    setError(null);
    setStarting(true);
    try {
      const updated = await repository.update(recordId, {
        ...recordToInput(record, record.memos, record.quotes),
        status: 'in_progress',
        startDate: todayString(),
        endDate: null,
      });
      if (!updated) throw new Error('not found');
      triggerImpactHaptic();
      onStart?.(recordId);
    } catch {
      setError(ERROR_START);
      setStarting(false);
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

  const oneLiner = record.oneLiner?.trim() ?? '';
  const word = getRatingWord(record.rating);
  const completed = record.status === 'completed';
  const noteable = record.status !== 'planned';
  const editing = sheet?.mode === 'edit' ? sheet.item : null;
  const empty = !hasRereadContent(record);
  const hasBody = entries.length > 0;
  const startAction = record.status === 'planned' || record.status === 'dropped' ? START_ACTIONS[record.status] : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + space[2] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="戻る" style={styles.back} onPress={() => onBack?.()}>
          <AppText style={styles.backMark}>‹</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="編集"
          style={styles.edit}
          onPress={() => onEdit?.(record.id)}
        >
          <AppText variant="button" style={{ color: colors.textSecondary, ...regularTextStyle }}>編集</AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset + space[6] }]}>
        <BookHero record={record} shelves={shelves} />
        {oneLiner ? <AppText variant="oneLine">{`「${oneLiner}」`}</AppText> : null}
        {record.rating !== null || record.favorite ? (
          <View style={styles.ratingRow}>
            {record.rating !== null ? (
              <View style={styles.rating}>
                <RatingStars rating={record.rating} size={STARS_SIZE} showValue={false} />
                <AppText variant="value">{formatRating(record.rating)}</AppText>
                {word ? (
                  <AppText variant="value" style={{ color: colors.ribbon }}>
                    {word}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <View />
            )}
            {record.favorite ? (
              <View style={styles.pill}>
                <AppText variant="label" style={{ color: colors.ribbon }}>
                  お気に入り
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {hasBody ? (
          <>
            <View style={styles.divider} />
            <View style={styles.entries}>
              {entries.map((item) => {
                if (item.kind === 'starter') {
                  return (
                    <RuledText key={`starter-${item.entry.id}`}>
                      <StarterText starter={item.entry.starter} text={item.entry.text} />
                    </RuledText>
                  );
                }
                return (
                  <RuledText key={`free-${item.entry.id}`}>
                    <AppText variant="reading">{item.entry.text.trim()}</AppText>
                  </RuledText>
                );
              })}
            </View>
          </>
        ) : null}

        {noteable || noteItems.length > 0 ? (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionHead}>
              <AppText variant="sectionTitle">メモと引用</AppText>
              <AppText variant="label" style={{ color: colors.textSecondary }}>{`${noteItems.length} 件`}</AppText>
            </View>
            {noteItems.length === 0 ? (
              <AppText variant="body" style={{ color: colors.textSecondary }}>
                まだ何もありません。気づいたことを、ひとこと残してみませんか
              </AppText>
            ) : (
              noteItems.map((item) =>
                item.kind === 'memo' ? (
                  <MemoRow
                    key={`memo-${item.entry.id}`}
                    memo={item.entry}
                    onPress={noteable ? () => setSheet({ mode: 'edit', item }) : undefined}
                  />
                ) : (
                  <Quote
                    key={`quote-${item.entry.id}`}
                    quote={item.entry}
                    onPress={noteable ? () => setSheet({ mode: 'edit', item }) : undefined}
                  />
                ),
              )
            )}
            {noteable ? (
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
            ) : null}
          </>
        ) : null}

        {empty && completed ? (
          <View style={styles.guide}>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              まだ何も書いていません。読み終えた直後の言葉を残しておくと、あとで人に勧めるときに助けになります
            </AppText>
            <Button label="書き出しの続きを書く" onPress={() => onWrite?.(record.id)} />
          </View>
        ) : null}

        {startAction ? (
          <View style={styles.guide}>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              {startAction.guide}
            </AppText>
            {error ? (
              <AppText variant="label" style={{ color: colors.danger }}>
                {error}
              </AppText>
            ) : null}
            <Button label={startAction.label} disabled={starting} onPress={() => void start()} />
          </View>
        ) : null}

        <View style={styles.divider} />
        <SettingsRow
          label="本棚"
          value={shelfNames(record, shelves).join('、') || 'まだ入れていません'}
          onPress={() => setShelfOpen(true)}
        />
        {completed && !empty ? <SettingsRow label="書き出しの続きを書く" onPress={() => onWrite?.(record.id)} /> : null}
      </ScrollView>

      {noteable ? (
        <NoteSheet
          visible={sheet !== null}
          bookTitle={record.title}
          recordId={record.id}
          editing={editing ? noteItemToDraft(editing) : undefined}
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
      ) : null}
      <ShelfPickSheet
        visible={shelfOpen}
        shelves={shelves}
        counts={counts}
        bookTitle={record.title}
        selectedIds={record.shelfIds}
        onSubmit={saveShelves}
        onCreate={createShelf}
        onClose={() => setShelfOpen(false)}
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
  back: { minHeight: size.touchMin, minWidth: size.touchMin, justifyContent: 'center' },
  backMark: {
    fontSize: typography.screenTitle.fontSize,
    lineHeight: typography.screenTitle.lineHeight,
    color: colors.textSecondary,
  },
  edit: { minHeight: size.touchMin, minWidth: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space[5], gap: space[3] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  pill: {
    borderWidth: 1,
    borderColor: colors.ribbon,
    borderRadius: radius.full,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space[3] },
  entries: { gap: space[4] },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  add: {
    minHeight: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textTertiary,
    borderRadius: radius.card,
    marginTop: space[2],
  },
  guide: { gap: space[4], paddingVertical: space[4] },
});
