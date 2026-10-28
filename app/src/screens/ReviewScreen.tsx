import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AddSheet } from '../components/AddSheet';
import { AppText } from '../components/AppText';
import { BookStackChart } from '../components/BookStackChart';
import { RatingBreakdown } from '../components/RatingBreakdown';
import { ReviewEmpty } from '../components/ReviewEmpty';
import { ScreenContainer } from '../components/ScreenContainer';
import { Shelf } from '../components/Shelf';
import { colors, radius, space, typography } from '../design/tokens';
import { useAddSheet } from '../hooks/useAddSheet';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecords } from '../hooks/useRecords';
import { summarizeReview } from '../lib/review';
import type { MediaRecord } from '../types/record';

// displayNumber は行の高さが文字の大きさと同じで、端末では数字の上が切れる。カードの数字だけ行を高くする
const NUMBER_LINE_HEIGHT = Math.ceil(typography.displayNumber.fontSize * 1.4);

type ReviewScreenProps = {
  onAdd?: () => void;
  onOpenRecord?: (record: MediaRecord) => void;
};

export function ReviewScreen({ onAdd, onOpenRecord }: ReviewScreenProps) {
  const { records, loading } = useRecords();
  const { addOpen, openAdd, closeAdd, select } = useAddSheet(onAdd);
  const bottomInset = useBottomInset();
  const { width } = useWindowDimensions();

  const summary = useMemo(() => summarizeReview(records, new Date()), [records]);

  if (loading) return null;

  if (records.length === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.header, styles.padded]}>
          <AppText variant="screenTitle">振り返り</AppText>
        </View>
        <ReviewEmpty onAdd={openAdd} />
        <AddSheet visible={addOpen} onClose={closeAdd} onSelect={select} />
      </ScreenContainer>
    );
  }

  const { period, read, impressions, months, favorites, ratings } = summary;
  const currentMonth = months[months.length - 1].month;

  return (
    <ScreenContainer>
      <ScrollView
        testID="review-scroll"
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}
      >
        <View style={styles.header}>
          <AppText variant="screenTitle">振り返り</AppText>
          <AppText variant="label" style={styles.secondary}>
            {period}
          </AppText>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <AppText variant="label" style={styles.secondary}>
              読んだ
            </AppText>
            <AppText variant="displayNumber" style={styles.number}>{`${read} 冊`}</AppText>
          </View>
          <View style={styles.card}>
            <AppText variant="label" style={styles.secondary}>
              感想
            </AppText>
            <AppText variant="displayNumber" style={styles.number}>
              {String(impressions)}
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="sectionTitle">月ごとに読んだ本</AppText>
          <BookStackChart months={months} currentMonth={currentMonth} />
        </View>

        {favorites.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="sectionTitle">今年のお気に入り</AppText>
            <Shelf
              records={favorites}
              width={width - space[4] * 2}
              onPressRecord={(record) => onOpenRecord?.(record)}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <AppText variant="sectionTitle">評価</AppText>
          <RatingBreakdown buckets={ratings.buckets} />
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space[4], gap: space[5] },
  padded: { paddingHorizontal: space[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: space[3],
  },
  secondary: { color: colors.textSecondary },
  cards: { flexDirection: 'row', gap: space[3] },
  card: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    gap: space[2],
  },
  number: { lineHeight: NUMBER_LINE_HEIGHT },
  section: { gap: space[3] },
});
