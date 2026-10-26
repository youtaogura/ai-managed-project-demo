import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { RatingDistribution } from '../components/RatingDistribution';
import { useRecords } from '../hooks/useRecords';
import { aggregateMonthlyCompletions, formatAverage, summarizeRatings } from '../lib/analytics';
import { KIND_LABELS } from '../lib/statusLabel';
import { colors, spacing } from '../theme';
import { MEDIA_KINDS } from '../types/record';

export function AnalyticsScreen() {
  const { records, loading } = useRecords();
  if (loading) return null;
  if (records.length === 0) {
    return <EmptyState title="分析できる記録がまだありません" />;
  }

  const { months, undatedCompleted } = aggregateMonthlyCompletions(records, new Date());
  const ratings = summarizeRatings(records);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.heading}>月別の完了数</Text>
        <MonthlyBarChart months={months} />
        {undatedCompleted > 0 ? (
          <Text style={styles.note}>{`終了日が未入力の記録: ${undatedCompleted} 件`}</Text>
        ) : null}
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>レーティングの分布</Text>
        <RatingDistribution distribution={ratings.distribution} />
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>平均</Text>
        <Text style={styles.average}>
          {`平均 ${formatAverage(ratings.average)}（${ratings.count} 件）`}
        </Text>
        {MEDIA_KINDS.map((kind) => {
          const entry = ratings.byKind[kind];
          return entry ? (
            <Text key={kind} style={styles.kindAverage}>
              {`${KIND_LABELS[kind]}: ${formatAverage(entry.average)}（${entry.count} 件）`}
            </Text>
          ) : null;
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.sm },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  note: { fontSize: 12, color: colors.textMuted },
  average: { fontSize: 16, color: colors.text },
  kindAverage: { fontSize: 14, color: colors.textMuted },
});
