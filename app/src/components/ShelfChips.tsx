import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { AppText } from './AppText';

const CHIP_HEIGHT = 36;
const CHIP_MAX_WIDTH = 160;
const FILL_DURATION = 150;

type ShelfChipsProps = {
  shelves?: readonly { id: string; name: string }[];
  /** 選択中の本棚。null は「すべての本」 */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onCreateShelf?: () => void;
};

const hitSlop = { top: (size.touchMin - CHIP_HEIGHT) / 2, bottom: (size.touchMin - CHIP_HEIGHT) / 2 };

type SelectChipProps = {
  selected: boolean;
  label: string;
  onPress: () => void;
  named?: boolean;
  children: ReactNode;
};

// 選択の塗りと枠線の色を短く動かす。selected は即時に切り替わる（動きを減らすときは色も即時）
function SelectChip({ selected, label, onPress, named, children }: SelectChipProps) {
  const reduceMotion = useReduceMotion();
  const [fill] = useState(() => new Animated.Value(selected ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      fill.setValue(selected ? 1 : 0);
      return;
    }
    const anim = Animated.timing(fill, { toValue: selected ? 1 : 0, duration: FILL_DURATION, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [selected, reduceMotion, fill]);
  const backgroundColor = fill.interpolate({ inputRange: [0, 1], outputRange: [colors.bg, colors.accent] });
  const borderColor = fill.interpolate({ inputRange: [0, 1], outputRange: [colors.line, colors.accent] });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={hitSlop}
      onPress={onPress}
      style={named && styles.named}
    >
      <Animated.View style={[styles.chip, styles.outline, named && styles.named, { backgroundColor, borderColor }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function ShelfChips({ shelves = [], selectedId = null, onSelect, onCreateShelf }: ShelfChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <SelectChip selected={selectedId === null} label="すべての本" onPress={() => onSelect?.(null)}>
        <AppText
          variant="value"
          style={{ color: selectedId === null ? colors.accentInk : colors.textPrimary }}
        >
          すべての本
        </AppText>
      </SelectChip>
      {shelves.map((shelf) => {
        const selected = shelf.id === selectedId;
        return (
          <SelectChip key={shelf.id} selected={selected} label={shelf.name} onPress={() => onSelect?.(shelf.id)} named>
            <AppText
              variant="value"
              numberOfLines={1}
              style={{ color: selected ? colors.accentInk : colors.textPrimary }}
            >
              {shelf.name}
            </AppText>
          </SelectChip>
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
  outline: { borderWidth: 1, borderColor: colors.line },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
});
