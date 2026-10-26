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

type ChipCellProps = {
  label: string;
  selected: boolean;
  role: 'radio' | 'checkbox';
  compact: boolean;
  basis: `${number}%`;
  onPress: () => void;
};

function ChipCell({ label, selected, role, compact, basis, onPress }: ChipCellProps) {
  const height = compact ? CHIP_COMPACT_HEIGHT : size.touchMin;
  const hitSlop = compact ? { top: 2, bottom: 2 } : undefined;
  return (
    <View style={[styles.cell, { width: basis }]}>
      <Pressable
        accessibilityRole={role}
        accessibilityLabel={label}
        accessibilityState={{ checked: selected, selected }}
        hitSlop={hitSlop}
        onPress={onPress}
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
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = options.length,
  compact = false,
}: ChipGroupProps<T>) {
  const basis = `${100 / columns}%` as const;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => (
        <ChipCell
          key={option.value}
          label={option.label}
          selected={option.value === value}
          role="radio"
          compact={compact}
          basis={basis}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

type ChipMultiGroupProps<T extends string> = {
  label: string;
  options: readonly ChipOption<T>[];
  values: readonly T[];
  /** タップされた値。選択・解除の判断は呼び出し側が行う。 */
  onChange: (value: T) => void;
  columns?: number;
};

export function ChipMultiGroup<T extends string>({
  label,
  options,
  values,
  onChange,
  columns = options.length,
}: ChipMultiGroupProps<T>) {
  const basis = `${100 / columns}%` as const;
  return (
    <View accessibilityLabel={label} style={styles.group}>
      {options.map((option) => (
        <ChipCell
          key={option.value}
          label={option.label}
          selected={values.includes(option.value)}
          role="checkbox"
          compact={false}
          basis={basis}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CHIP_GAP / 2,
  },
  cell: { paddingHorizontal: CHIP_GAP / 2, paddingBottom: space[2] },
  chip: {
    borderWidth: 1,
    borderRadius: CHIP_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
