import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { RatingSlider } from '../components/RatingSlider';
import { Shelf } from '../components/Shelf';
import { ToggleRow } from '../components/Toggle';
import { colors, radius, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { buildFinishedSummary, RATING_GUIDE } from '../lib/finished';
import { recordToInput } from '../lib/notes';
import { getRatingWord } from '../lib/ratingWord';
import { formatRating } from '../lib/recordForm';
import type { MediaRecord } from '../types/record';

const ERROR_SAVE = '保存できませんでした。もう一度お試しください';
const SPINE_SHELF_WIDTH = space[6] * 5;
const BAR_PADDING = space[4];
const TOGGLE_ROW_HEIGHT = 52;

type FinishedScreenProps = {
  recordId: string;
  onWrite?: (id: string) => void;
  onLater?: () => void;
  onBack?: () => void;
};

export function FinishedScreen({ recordId, onWrite, onLater, onBack }: FinishedScreenProps) {
  const bottomInset = useBottomInset();
  const repository = useRecordRepository();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<{ rating: number | null; favorite: boolean }>({ rating: null, favorite: false });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      repository
        .getAll()
        .catch(() => [] as MediaRecord[])
        .then((all) => {
          if (!active) return;
          const found = all.find((r) => r.id === recordId) ?? null;
          setRecord(found);
          if (found) {
            latest.current = { rating: found.rating, favorite: found.favorite };
            setRating(found.rating);
            setFavorite(found.favorite);
          }
          setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [repository, recordId]),
  );

  // 保存は直列にして、最後の値が残るようにする。失敗したときは onFail で元に戻す。
  const persist = (patch: { rating?: number | null; favorite?: boolean }, onFail?: () => void) => {
    setError(null);
    queue.current = queue.current.then(async () => {
      try {
        const current = (await repository.getAll()).find((r) => r.id === recordId);
        if (!current) throw new Error('not found');
        const updated = await repository.update(recordId, { ...recordToInput(current, current.memos, current.quotes), ...patch });
        if (!updated) throw new Error('not found');
        setRecord(updated);
      } catch {
        onFail?.();
        setError(ERROR_SAVE);
      }
    });
  };

  const changeRating = (value: number) => {
    latest.current.rating = value;
    setRating(value);
    persist({ rating: value });
  };

  const changeFavorite = (value: boolean) => {
    const before = latest.current.favorite;
    latest.current.favorite = value;
    setFavorite(value);
    persist({ favorite: value }, () => {
      latest.current.favorite = before;
      setFavorite(before);
    });
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
        <Button label="本棚へ戻る" onPress={() => (onBack ?? onLater)?.()} />
      </View>
    );
  }

  const word = getRatingWord(rating);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: size.buttonHeight * 2 + BAR_PADDING * 2 + space[2] + bottomInset + space[6] },
        ]}
      >
        <View style={styles.spine}>
          <Shelf records={[record]} width={SPINE_SHELF_WIDTH} onPressRecord={() => undefined} />
        </View>
        <AppText variant="label" style={[styles.centered, { color: colors.ribbon }]}>
          読み終えた
        </AppText>
        <AppText variant="bookTitle" style={styles.centered}>
          {record.title}
        </AppText>
        <AppText variant="label" style={[styles.centered, { color: colors.textSecondary }]}>
          {buildFinishedSummary(record)}
        </AppText>
        <AppText variant="value" style={[styles.centered, styles.question]}>
          どうだった？
        </AppText>
        <View style={styles.stars}>
          <RatingSlider value={rating} onChange={changeRating} />
        </View>
        {rating !== null && word !== null ? (
          <View style={styles.result}>
            <AppText variant="displayNumber">{formatRating(rating)}</AppText>
            <AppText variant="reading" style={{ color: colors.ribbon }}>
              {word}
            </AppText>
          </View>
        ) : null}
        <AppText variant="micro" style={[styles.centered, { color: colors.textSecondary }]}>
          {RATING_GUIDE.map((g) => `${g.word} ${g.range}`).join(' · ')}
        </AppText>
        <AppText variant="micro" style={[styles.centered, { color: colors.textSecondary }]}>
          星をなぞると 0.1 ずつ変わります
        </AppText>
        <ToggleRow label="お気に入りにする" value={favorite} onValueChange={changeFavorite} style={styles.toggleRow} />
        {error ? (
          <AppText variant="body" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: BAR_PADDING + bottomInset }]}>
        <Button label="記録を書く" onPress={() => onWrite?.(record.id)} />
        <Pressable accessibilityRole="button" accessibilityLabel="あとで書く" style={styles.later} onPress={() => onLater?.()}>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            あとで書く
          </AppText>
        </Pressable>
      </View>
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
  body: { paddingHorizontal: space[5], gap: space[3], paddingTop: space[6] },
  spine: { alignItems: 'center', paddingBottom: space[2] },
  centered: { textAlign: 'center' },
  question: { color: colors.textSecondary },
  stars: { alignItems: 'center' },
  result: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space[2] },
  toggleRow: {
    minHeight: TOGGLE_ROW_HEIGHT,
    paddingHorizontal: space[4],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface1,
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
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  later: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
});
