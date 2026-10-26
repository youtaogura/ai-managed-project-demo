import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AddSheet } from '../components/AddSheet';
import { AppText } from '../components/AppText';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { RatingDistribution } from '../components/RatingDistribution';
import { ReviewEmpty } from '../components/ReviewEmpty';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors, radius, size, space } from '../design/tokens';
import { useAddSheet } from '../hooks/useAddSheet';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecords } from '../hooks/useRecords';
import {
  aggregateMonthlyCompletions,
  formatAverage,
  formatPeriod,
  summarizeRatings,
  summarizeYear,
} from '../lib/analytics';

type ReviewScreenProps = {
  onAdd?: () => void;
  onOpenRecords?: () => void;
};

export function ReviewScreen({ onAdd, onOpenRecords }: ReviewScreenProps) {
  const { records, loading } = useRecords();
  const { addOpen, openAdd, closeAdd, select } = useAddSheet(onAdd);
  const bottomInset = useBottomInset();

  const summary = useMemo(() => {
    const monthly = aggregateMonthlyCompletions(records, new Date());
    return {
      monthly,
      period: formatPeriod(monthly.months),
      yearCount: summarizeYear(monthly),
      currentMonth: monthly.months[monthly.months.length - 1].month,
      ratings: summarizeRatings(records),
    };
  }, [records]);

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

  const { monthly, period, yearCount, currentMonth, ratings } = summary;

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
              この1年で終えた
            </AppText>
            <View style={styles.cardValue}>
              <AppText variant="displayNumber">{String(yearCount)}</AppText>
              <AppText variant="label" style={styles.secondary}>
                作品
              </AppText>
            </View>
          </View>
          <View style={styles.card}>
            <AppText variant="label" style={styles.secondary}>
              平均レーティング
            </AppText>
            <AppText variant="displayNumber">{formatAverage(ratings.average)}</AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="sectionTitle">月別の完了数</AppText>
          <MonthlyBarChart months={monthly.months} currentMonth={currentMonth} />
        </View>

        {monthly.undatedCompleted > 0 ? (
          <View style={styles.notice}>
            <AppText variant="label" style={styles.secondary}>
              {`終了日が未入力の記録: ${monthly.undatedCompleted} 件`}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="入力する"
              onPress={() => onOpenRecords?.()}
              style={styles.noticeAction}
            >
              <AppText variant="value" style={styles.underline}>
                入力する
              </AppText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <AppText variant="sectionTitle">レーティング</AppText>
          <RatingDistribution distribution={ratings.distribution} />
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space[5], gap: space[5] },
  padded: { paddingHorizontal: space[5] },
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
    padding: space[4],
    gap: space[2],
  },
  cardValue: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  section: { gap: space[3] },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingLeft: space[4],
  },
  noticeAction: {
    minHeight: size.touchMin,
    minWidth: size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  underline: { textDecorationLine: 'underline' },
});
