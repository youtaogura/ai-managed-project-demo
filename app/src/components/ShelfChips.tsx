import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';

const CHIP_HEIGHT = 36;
const CHIP_MAX_WIDTH = 160;

type ShelfChipsProps = {
  shelves?: readonly { id: string; name: string }[];
  /** 選択中の本棚。null は「すべての本」 */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onCreateShelf?: () => void;
};

const hitSlop = { top: (size.touchMin - CHIP_HEIGHT) / 2, bottom: (size.touchMin - CHIP_HEIGHT) / 2 };

export function ShelfChips({ shelves = [], selectedId = null, onSelect, onCreateShelf }: ShelfChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="すべての本"
        accessibilityState={{ selected: selectedId === null }}
        hitSlop={hitSlop}
        onPress={() => onSelect?.(null)}
        style={[styles.chip, selectedId === null ? styles.selected : styles.outline]}
      >
        <AppText
          variant="value"
          style={{ color: selectedId === null ? colors.accentInk : colors.textPrimary }}
        >
          すべての本
        </AppText>
      </Pressable>
      {shelves.map((shelf) => {
        const selected = shelf.id === selectedId;
        return (
          <Pressable
            key={shelf.id}
            accessibilityRole="button"
            accessibilityLabel={shelf.name}
            accessibilityState={{ selected }}
            hitSlop={hitSlop}
            onPress={() => onSelect?.(shelf.id)}
            style={[styles.chip, styles.named, selected ? styles.selected : styles.outline]}
          >
            <AppText
              variant="value"
              numberOfLines={1}
              style={{ color: selected ? colors.accentInk : colors.textPrimary }}
            >
              {shelf.name}
            </AppText>
          </Pressable>
        );
      })}
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
  named: { maxWidth: CHIP_MAX_WIDTH },
  selected: { backgroundColor: colors.accent },
  outline: { borderWidth: 1, borderColor: colors.line },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
});
