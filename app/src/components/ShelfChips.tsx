import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';

const CHIP_HEIGHT = 36;

type ShelfChipsProps = {
  /** 作った本棚。#86 でつなぐ。渡されれば「すべての本」の後ろに出す。 */
  shelves?: readonly { id: string; name: string }[];
  onCreateShelf?: () => void;
};

const hitSlop = { top: (size.touchMin - CHIP_HEIGHT) / 2, bottom: (size.touchMin - CHIP_HEIGHT) / 2 };

export function ShelfChips({ shelves = [], onCreateShelf }: ShelfChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="すべての本"
        accessibilityState={{ selected: true }}
        hitSlop={hitSlop}
        style={[styles.chip, styles.selected]}
      >
        <AppText variant="value" style={{ color: colors.accentInk }}>
          すべての本
        </AppText>
      </Pressable>
      {shelves.map((shelf) => (
        <Pressable
          key={shelf.id}
          accessibilityRole="button"
          accessibilityLabel={shelf.name}
          accessibilityState={{ selected: false }}
          hitSlop={hitSlop}
          style={[styles.chip, styles.outline]}
        >
          <AppText variant="value">{shelf.name}</AppText>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="本棚を作る"
        hitSlop={hitSlop}
        onPress={() => onCreateShelf?.()}
        style={[styles.chip, styles.dashed]}
      >
        <AppText variant="value" style={{ color: colors.textSecondary }}>
          ＋ 本棚を作る
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space[5], gap: space[2], alignItems: 'center' },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.accent },
  outline: { borderWidth: 1, borderColor: colors.lineStrong },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
});
