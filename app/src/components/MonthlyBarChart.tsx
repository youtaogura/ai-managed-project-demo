import { StyleSheet, Text, View } from 'react-native';

import type { MonthlyCompletion } from '../lib/analytics';
import { KIND_LABELS } from '../lib/statusLabel';
import { colors, kindColors, spacing } from '../theme';
import { MEDIA_KINDS } from '../types/record';

const CHART_HEIGHT = 120;

type MonthlyBarChartProps = { months: MonthlyCompletion[] };

export function MonthlyBarChart({ months }: MonthlyBarChartProps) {
  const max = Math.max(0, ...months.map((m) => m.total));
  return (
    <View>
      <View style={styles.legend}>
        {MEDIA_KINDS.map((kind) => (
          <View key={kind} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: kindColors[kind] }]} />
            <Text style={styles.legendText}>{KIND_LABELS[kind]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chart}>
        {months.map((m) => (
          <View key={m.month} style={styles.column}>
            <Text style={styles.total}>{m.total}</Text>
            <View style={styles.barArea}>
              <View style={styles.stack}>
                {MEDIA_KINDS.map((kind) =>
                  m.byKind[kind] > 0 ? (
                    <View
                      key={kind}
                      style={{
                        height: (m.byKind[kind] / max) * CHART_HEIGHT,
                        backgroundColor: kindColors[kind],
                      }}
                    />
                  ) : null,
                )}
              </View>
            </View>
            <Text style={styles.month} numberOfLines={1}>
              {m.month}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: colors.text },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  column: { flex: 1, alignItems: 'center' },
  total: { fontSize: 11, color: colors.text },
  barArea: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%' },
  stack: { flexDirection: 'column-reverse', width: '100%' },
  month: { fontSize: 8, color: colors.textMuted, marginTop: 2 },
});
