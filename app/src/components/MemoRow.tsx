import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { formatPage } from '../lib/notes';
import type { MemoEntry } from '../types/record';
import { AppText } from './AppText';

const PAGE_WIDTH = 38;

type MemoRowProps = {
  memo: MemoEntry;
  onPress?: (memo: MemoEntry) => void;
  /** 本文の色。読み返す画面では控えめにするため textSecondary を渡す。 */
  textColor?: string;
};

export function MemoRow({ memo, onPress, textColor }: MemoRowProps) {
  const body = (
    <View style={styles.row}>
      <AppText variant="micro" style={[styles.page, { color: colors.textTertiary }]}>
        {memo.page ? formatPage(memo.page) : '—'}
      </AppText>
      <AppText variant="body" style={[styles.text, textColor ? { color: textColor } : null]}>
        {memo.text}
      </AppText>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`メモ ${memo.text}`} onPress={() => onPress(memo)}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: size.touchMin, paddingVertical: space[2] },
  page: { width: PAGE_WIDTH, paddingTop: space[1] },
  text: { flex: 1 },
});
