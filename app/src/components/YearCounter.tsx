import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { AppText } from './AppText';

const NUMBER_SIZE = 30;

type YearCounterProps = { year: number; month: number };

export function YearCounter({ year, month }: YearCounterProps) {
  return (
    <View
      accessible
      accessibilityLabel={`今年 ${year} 作品 · 今月 ${month}`}
      style={styles.row}
    >
      <AppText variant="label" style={styles.secondary}>
        今年
      </AppText>
      <AppText
        variant="displayNumber"
        style={styles.number}
      >
        {String(year)}
      </AppText>
      <AppText variant="label" style={styles.secondary}>
        {`作品 · 今月 ${month}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  secondary: { color: colors.textSecondary },
  number: { color: colors.accent, fontSize: NUMBER_SIZE, lineHeight: NUMBER_SIZE + 4 },
});
