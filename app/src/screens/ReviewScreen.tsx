import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AddSheet } from '../components/AddSheet';
import { AppText } from '../components/AppText';
import { BookStackChart } from '../components/BookStackChart';
import { RatingBreakdown } from '../components/RatingBreakdown';
import { ReviewEmpty } from '../components/ReviewEmpty';
import { ScreenContainer } from '../components/ScreenContainer';
import { Shelf } from '../components/Shelf';
import { colors, radius, space } from '../design/tokens';
import { useAddSheet } from '../hooks/useAddSheet';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecords } from '../hooks/useRecords';
import { formatAverage } from '../lib/analytics';
import { summarizeReview } from '../lib/review';
import type { MediaRecord } from '../types/record';

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

  const { period, read, impressions, quotes, months, favorites, ratings, topStarter } = summary;
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
            <AppText variant="displayNumber">{`${read} 冊`}</AppText>
          </View>
          <View style={styles.card}>
            <AppText variant="label" style={styles.secondary}>
              感想
            </AppText>
            <AppText variant="displayNumber">{String(impressions)}</AppText>
          </View>
          <View style={styles.card}>
            <AppText variant="label" style={styles.secondary}>
              引用
            </AppText>
            <AppText variant="displayNumber">{String(quotes)}</AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="sectionTitle">月ごとに読んだ本</AppText>
          <BookStackChart months={months} currentMonth={currentMonth} />
          <AppText variant="micro" style={styles.secondary}>
            1冊が1段。背表紙の色で積み上がります
          </AppText>
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
          <AppText variant="sectionTitle">どうだった？</AppText>
          <View style={styles.average}>
            <AppText variant="label" style={styles.secondary}>
              平均
            </AppText>
            <AppText variant="displayNumber">{formatAverage(ratings.average)}</AppText>
            {ratings.word !== null ? <AppText variant="value" style={styles.word}>
                {ratings.word}
              </AppText> : null}
          </View>
          <RatingBreakdown buckets={ratings.buckets} />
        </View>

        {topStarter !== null ? (
          <View style={styles.section}>
            <AppText variant="sectionTitle">今年いちばん使った書き出し</AppText>
            <View style={styles.starterCard}>
              <AppText variant="starter">{topStarter.text}</AppText>
              <AppText variant="label" style={styles.secondary}>
                {`· ${topStarter.count} 回`}
              </AppText>
            </View>
          </View>
        ) : null}
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
  section: { gap: space[3] },
  average: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  word: { color: colors.ribbon },
  starterCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space[2],
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
  },
});
