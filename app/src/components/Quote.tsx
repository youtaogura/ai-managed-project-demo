import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { formatPage } from '../lib/notes';
import type { QuoteEntry } from '../types/record';
import { AppText } from './AppText';

export const QUOTE_LINE_WIDTH = 2;
export const LINE_GAP = space[4];

type QuoteProps = {
  quote: QuoteEntry;
  onPress?: (quote: QuoteEntry) => void;
};

export function Quote({ quote, onPress }: QuoteProps) {
  const body = (
    <View style={styles.row}>
      <View testID="quote-line" style={styles.line} />
      <View style={styles.content}>
        {quote.starter ? (
          <AppText variant="micro" style={{ color: colors.textSecondary }}>
            {quote.starter}
          </AppText>
        ) : null}
        <AppText variant="quote">{quote.text}</AppText>
        {quote.page ? (
          <AppText variant="micro" style={{ color: colors.textSecondary }}>
            {formatPage(quote.page)}
          </AppText>
        ) : null}
        {quote.comment ? (
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            {quote.comment}
          </AppText>
        ) : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`引用 ${quote.text}`} onPress={() => onPress(quote)}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: size.touchMin, paddingVertical: space[2] },
  line: { width: QUOTE_LINE_WIDTH, backgroundColor: colors.ribbon },
  content: { flex: 1, marginLeft: LINE_GAP, gap: space[1] },
});
