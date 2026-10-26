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
import { useSettings } from '../hooks/useSettings';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecords } from '../hooks/useRecords';
import {
  aggregateMonthlyCompletions,
  formatAverage,
  formatPeriod,
  summarizeRatings,
  summarizeYear,
} from '../lib/analytics';
import { filterRecordsByKinds } from '../lib/enabledKinds';
import { KIND_LABELS } from '../lib/statusLabel';

type ReviewScreenProps = {
  onAdd?: () => void;
  onOpenRecords?: () => void;
};

export function ReviewScreen({ onAdd, onOpenRecords }: ReviewScreenProps) {
  const { records: allRecords, loading } = useRecords();
  const { settings } = useSettings();
  const { addOpen, openAdd, closeAdd, select, enabledKinds, mediaSearchEnabled } =
    useAddSheet(onAdd);
  const bottomInset = useBottomInset();

  const records = useMemo(
    () => filterRecordsByKinds(allRecords, settings.enabledKinds),
    [allRecords, settings.enabledKinds],
  );
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
        <AddSheet
          visible={addOpen}
          onClose={closeAdd}
          onSelect={select}
          mediaSearchEnabled={mediaSearchEnabled}
          enabledKinds={enabledKinds}
        />
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
          <MonthlyBarChart
            months={monthly.months}
            currentMonth={currentMonth}
            kinds={enabledKinds}
          />
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

        <View style={styles.section}>
          <AppText variant="label" style={styles.secondary}>
            種別ごとの平均
          </AppText>
          <View>
            {enabledKinds.map((kind) => {
              const entry = ratings.byKind[kind];
              return entry ? (
                <View key={kind} style={styles.kindRow}>
                  <AppText variant="body" style={styles.kindName}>
                    {KIND_LABELS[kind]}
                  </AppText>
                  <AppText variant="label" style={styles.secondary}>
                    {`${entry.count} 作品`}
                  </AppText>
                  <AppText variant="value" style={styles.kindAverage}>
                    {formatAverage(entry.average)}
                  </AppText>
                </View>
              ) : null;
            })}
          </View>
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
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  kindName: { flex: 1 },
  kindAverage: { minWidth: 32, textAlign: 'right' },
});
