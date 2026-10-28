import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';

const CHIP_HEIGHT = 36;
const CHIP_PADDING_X = 14;
const CHIP_GAP = space[2];
const HIT_SLOP = { top: (size.touchMin - CHIP_HEIGHT) / 2, bottom: (size.touchMin - CHIP_HEIGHT) / 2 };

export type ChipOption<T extends string> = { value: T; label: string };

type ChipGroupProps<T extends string> = {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** チップの最小幅。行をまたいでチップの列を揃えたいときに使う */
  minChipWidth?: number;
};

type ChipCellProps = {
  label: string;
  selected: boolean;
  role: 'radio' | 'checkbox';
  onPress: () => void;
  minWidth?: number;
};

function ChipCell({ label, selected, role, onPress, minWidth }: ChipCellProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[
        styles.chip,
        minWidth !== undefined && { minWidth },
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { borderColor: colors.line },
      ]}
    >
      <AppText variant="value" style={{ color: selected ? colors.accentInk : colors.textPrimary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

type DashedChipProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
};

/** 点線の「＋ …を作る」チップ。選択ではなく、作成の入口 */
export function DashedChip({ label, accessibilityLabel, onPress }: DashedChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[styles.chip, styles.dashed]}
    >
      <AppText variant="value" style={{ color: colors.textSecondary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({ label, options, value, onChange, minChipWidth }: ChipGroupProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => (
        <ChipCell
          key={option.value}
          label={option.label}
          selected={option.value === value}
          role="radio"
          minWidth={minChipWidth}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

type ChipMultiGroupProps<T extends string> = {
  label: string;
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onToggle: (value: T) => void;
  /** 最後に並べるもの（点線のチップなど） */
  trailing?: ReactNode;
};

/** 複数選択。選んだものは value に入り、押すたびに onToggle が呼ばれる。 */
export function ChipMultiGroup<T extends string>({
  label,
  options,
  value,
  onToggle,
  trailing,
}: ChipMultiGroupProps<T>) {
  return (
    <View accessibilityLabel={label} style={styles.group}>
      {options.map((option) => (
        <ChipCell
          key={option.value}
          label={option.label}
          selected={value.includes(option.value)}
          role="checkbox"
          onPress={() => onToggle(option.value)}
        />
      ))}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: CHIP_GAP },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: CHIP_PADDING_X,
    borderWidth: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashed: { borderStyle: 'dashed', borderColor: colors.lineStrong },
});
