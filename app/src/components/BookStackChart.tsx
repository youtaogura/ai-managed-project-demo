import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { monthLabel } from '../lib/analytics';
import { spineColorToken } from '../lib/spineColor';
import type { SpineColor } from '../types/record';
import { AppText } from './AppText';

const SEGMENT_HEIGHT = 12;
const SEGMENT_GAP = 3;
const MAX_SEGMENTS = 8;
const COUNT_HEIGHT = 14;
const STACK_AREA_HEIGHT =
  MAX_SEGMENTS * (SEGMENT_HEIGHT + SEGMENT_GAP) + COUNT_HEIGHT + SEGMENT_GAP;

type BookStackChartProps = {
  months: { month: string; books: { id: string; spineColor: SpineColor }[] }[];
  currentMonth: string;
};

export function BookStackChart({ months, currentMonth }: BookStackChartProps) {
  return (
    <View style={styles.chart}>
      {months.map((m) => {
        const label = monthLabel(m.month);
        const total = m.books.length;
        return (
          <View
            key={m.month}
            accessible
            accessibilityLabel={`${label} ${total} 冊`}
            style={styles.column}
          >
            <View style={styles.stackArea}>
              {total > 0 ? (
                <AppText variant="micro" style={styles.total}>
                  {String(total)}
                </AppText>
              ) : null}
              {m.books
                .slice(0, MAX_SEGMENTS)
                .reverse()
                .map((book) => (
                  <View
                    key={book.id}
                    testID={`stack-segment-${book.id}`}
                    style={[styles.segment, { backgroundColor: spineColorToken(book.spineColor) }]}
                  />
                ))}
            </View>
            <AppText
              variant={m.month === currentMonth ? 'tab' : 'micro'}
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
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  column: { flex: 1, alignItems: 'center', gap: space[1] },
  stackArea: {
    height: STACK_AREA_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
    gap: SEGMENT_GAP,
  },
  total: { color: colors.textSecondary, textAlign: 'center' },
  segment: { width: '100%', height: SEGMENT_HEIGHT, borderRadius: radius.thumb },
});
