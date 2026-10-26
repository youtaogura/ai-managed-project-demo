import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { monthLabel, type MonthlyCompletion } from '../lib/analytics';
import { AppText } from './AppText';

const CHART_HEIGHT = 120;
const COUNT_HEIGHT = 14;
const MIN_BAR = 2;

type MonthlyBarChartProps = {
  months: MonthlyCompletion[];
  currentMonth: string;
};

export function MonthlyBarChart({ months, currentMonth }: MonthlyBarChartProps) {
  const max = Math.max(0, ...months.map((m) => m.total));
  return (
    <View>
      <View style={styles.chart}>
        {months.map((m) => {
          const label = monthLabel(m.month);
          const barHeight = m.total === 0 ? 0 : Math.max(MIN_BAR, (m.total / max) * CHART_HEIGHT);
          return (
            <View
              key={m.month}
              accessible
              accessibilityLabel={`${label} ${m.total} 作品`}
              style={styles.column}
            >
              <View style={styles.barArea}>
                {m.total > 0 ? (
                  <AppText variant="micro" style={styles.total}>
                    {String(m.total)}
                  </AppText>
                ) : null}
                <View style={[styles.bar, { height: barHeight }]} />
              </View>
              <AppText
                variant="micro"
                numberOfLines={1}
                style={{
                  color: m.month === currentMonth ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  column: { flex: 1, alignItems: 'center', gap: space[1] },
  barArea: {
    height: CHART_HEIGHT + COUNT_HEIGHT + 2,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  total: { color: colors.textSecondary, marginBottom: 2 },
  bar: { width: '100%', borderRadius: 2, backgroundColor: colors.textPrimary },
});
