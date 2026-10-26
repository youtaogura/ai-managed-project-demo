import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

const CHIP_RADIUS = 10;
const CHIP_COMPACT_HEIGHT = 40;
const CHIP_GAP = 6;

export type ChipOption<T extends string> = { value: T; label: string };

type ChipGroupProps<T extends string> = {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: number;
  compact?: boolean;
};

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = options.length,
  compact = false,
}: ChipGroupProps<T>) {
  const height = compact ? CHIP_COMPACT_HEIGHT : size.touchMin;
  const hitSlop = compact ? { top: 2, bottom: 2 } : undefined;
  const basis = `${100 / columns}%` as const;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <View key={option.value} style={[styles.cell, { width: basis }]}>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, selected }}
              hitSlop={hitSlop}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                { height },
                selected
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { borderColor: colors.lineStrong },
              ]}
            >
              <AppText
                variant="label"
                style={{ color: selected ? colors.accentInk : colors.textSecondary }}
              >
                {option.label}
              </AppText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -CHIP_GAP / 2 },
  cell: { paddingHorizontal: CHIP_GAP / 2, paddingBottom: space[2] },
  chip: {
    borderWidth: 1,
    borderRadius: CHIP_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
