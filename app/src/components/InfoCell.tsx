import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';

const CELL_PADDING_Y = 10;
const CELL_PADDING_X = 12;
const EMPTY_VALUE = '—';

type InfoCellProps = {
  label: string;
  value?: string | null;
  onPress?: () => void;
};

export function InfoCell({ label, value, onPress }: InfoCellProps) {
  const shown = value ? value : EMPTY_VALUE;
  const body = (
    <>
      <AppText variant="micro" style={{ color: colors.textSecondary }}>
        {label}
      </AppText>
      <AppText variant="value">{shown}</AppText>
    </>
  );
  if (!onPress) {
    return <View style={styles.cell}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${shown}`}
      onPress={onPress}
      style={styles.cell}
    >
      {body}
    </Pressable>
  );
}

export function InfoCellRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.card,
    paddingVertical: CELL_PADDING_Y,
    paddingHorizontal: CELL_PADDING_X,
  },
  row: { flexDirection: 'row', gap: space[2] },
});
