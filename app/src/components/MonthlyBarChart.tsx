import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { monthLabel, type MonthlyCompletion } from '../lib/analytics';
import { KIND_SHADES } from '../lib/kindShades';
import { KIND_LABELS } from '../lib/statusLabel';
import { MEDIA_KINDS, type MediaKind } from '../types/record';
import { AppText } from './AppText';

const CHART_HEIGHT = 120;
const COUNT_HEIGHT = 14;
const MIN_BAR = 2;
const SWATCH = 8;

type MonthlyBarChartProps = {
  months: MonthlyCompletion[];
  currentMonth: string;
  /** 積み上げ・凡例に出す種別（省略時はすべて）。 */
  kinds?: readonly MediaKind[];
};

export function MonthlyBarChart({
  months,
  currentMonth,
  kinds = MEDIA_KINDS,
}: MonthlyBarChartProps) {
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
                <View style={[styles.stack, { height: barHeight }]}>
                  {kinds.map((kind) =>
                    m.byKind[kind] > 0 ? (
                      <View
                        key={kind}
                        style={{
                          flex: m.byKind[kind],
                          backgroundColor: KIND_SHADES[kind],
                        }}
                      />
                    ) : null,
                  )}
                </View>
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
      <View style={styles.legend}>
        {kinds.map((kind) => (
          <View key={kind} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: KIND_SHADES[kind] }]} />
            <AppText variant="micro" style={styles.legendText}>
              {KIND_LABELS[kind]}
            </AppText>
          </View>
        ))}
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
  stack: {
    flexDirection: 'column-reverse',
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[3],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: 2 },
  legendText: { color: colors.textSecondary },
});
