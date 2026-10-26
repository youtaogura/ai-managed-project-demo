import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import type { StatusFilter } from '../lib/countByStatus';
import { AppText } from './AppText';

export type { StatusFilter };

const TABS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'in_progress', label: '読んでる' },
  { value: 'completed', label: '読んだ' },
  { value: 'planned', label: '読みたい' },
];

const UNDERLINE = 2;

type StatusTabsProps = {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
};

export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {TABS.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} ${counts[tab.value]}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.value)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <AppText variant="body" style={styles.text}>
              {tab.label}
            </AppText>
            <AppText variant="label" style={styles.count}>
              {counts[tab.value]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    flex: 1,
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    borderBottomWidth: UNDERLINE,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabSelected: { borderBottomColor: colors.ribbon },
  text: { lineHeight: 20 },
  count: { color: colors.textSecondary },
});
