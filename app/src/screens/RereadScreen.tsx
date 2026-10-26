import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { MemoRow } from '../components/MemoRow';
import { Quote } from '../components/Quote';
import { RatingStars } from '../components/RatingStars';
import { SettingsRow } from '../components/SettingsRow';
import { ShelfPickSheet } from '../components/ShelfPickSheet';
import { StarterText } from '../components/StarterText';
import { colors, radius, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useShelfPick } from '../hooks/useShelfPick';
import { useTopInset } from '../hooks/useTopInset';
import { recordToInput, sortMemos } from '../lib/notes';
import { getRatingWord } from '../lib/ratingWord';
import { buildRereadEntries, buildRereadPeriod, hasRereadContent } from '../lib/reread';
import { formatRating } from '../lib/recordForm';
import { shelfNames } from '../lib/shelfSelectors';
import type { MediaRecord } from '../types/record';

const STARS_SIZE = 18;

type RereadScreenProps = {
  recordId: string;
  onEdit?: (id: string) => void;
  onWrite?: (id: string) => void;
  onBack?: () => void;
};

export function RereadScreen({ recordId, onEdit, onWrite, onBack }: RereadScreenProps) {
  const bottomInset = useBottomInset();
  const topInset = useTopInset();
  const repository = useRecordRepository();
  const { shelves, counts, create: createShelf } = useShelfPick();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [shelfOpen, setShelfOpen] = useState(false);

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
  const memos = useMemo(() => (record ? sortMemos(record.memos.filter((m) => m.text.trim() !== '')) : []), [record]);

  const saveShelves = async (shelfIds: string[]) => {
    if (!record) return;
    const updated = await repository.update(recordId, {
      ...recordToInput(record, record.memos, record.quotes),
      shelfIds,
    });
    if (!updated) throw new Error('not found');
    setRecord(updated);
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

  const meta = [record.creator, buildRereadPeriod(record)].filter((v): v is string => !!v).join(' · ');
  const oneLiner = record.oneLiner?.trim() ?? '';
  const word = getRatingWord(record.rating);
  const completed = record.status === 'completed';
  const empty = !hasRereadContent(record);
  const hasBody = entries.length > 0;

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
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset + space[6] }]}>
        <AppText variant="bookTitle" style={{ color: colors.textSecondary }}>
          {record.title}
        </AppText>
        {meta ? (
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            {meta}
          </AppText>
        ) : null}
        {oneLiner ? <AppText variant="oneLine">{`「${oneLiner}」`}</AppText> : null}
        {record.rating !== null || record.favorite ? (
          <View style={styles.ratingRow}>
            {record.rating !== null ? (
              <View style={styles.rating}>
                <RatingStars rating={record.rating} size={STARS_SIZE} showValue={false} />
                <AppText variant="value">{formatRating(record.rating)}</AppText>
                {word ? (
                  <AppText variant="label" style={{ color: colors.textSecondary }}>
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
                  return <StarterText key={`starter-${item.entry.id}`} starter={item.entry.starter} text={item.entry.text} />;
                }
                if (item.kind === 'quote') {
                  return <Quote key={`quote-${item.entry.id}`} quote={item.entry} />;
                }
                return (
                  <AppText key={`free-${item.entry.id}`} variant="reading">
                    {item.entry.text.trim()}
                  </AppText>
                );
              })}
            </View>
            <View style={styles.ruled} />
          </>
        ) : null}

        {memos.length > 0 ? (
          <>
            <View style={styles.divider} />
            <AppText variant="label" style={{ color: colors.textSecondary }}>
              メモ
            </AppText>
            {memos.map((memo) => (
              <MemoRow key={memo.id} memo={memo} />
            ))}
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

        <View style={styles.divider} />
        <SettingsRow
          label="本棚"
          value={shelfNames(record, shelves).join('、') || 'まだ入れていません'}
          onPress={() => setShelfOpen(true)}
        />
        {completed && !empty ? <SettingsRow label="書き出しの続きを書く" onPress={() => onWrite?.(record.id)} /> : null}
      </ScrollView>

      <ShelfPickSheet
        visible={shelfOpen}
        shelves={shelves}
        counts={counts}
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
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space[2] },
  entries: { gap: space[4] },
  ruled: { height: 1, backgroundColor: colors.line },
  guide: { gap: space[4], paddingVertical: space[4] },
});
