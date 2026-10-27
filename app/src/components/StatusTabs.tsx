import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { colors, size, space, typography } from '../design/tokens';
import { resolveFontFamily } from '../design/fonts';
import { useReduceMotion } from '../hooks/useReduceMotion';
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
const SLIDE_DURATION = 200;

type TabLayout = { x: number; width: number };

type StatusTabsProps = {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
};

export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  const reduceMotion = useReduceMotion();
  const [layouts, setLayouts] = useState<Partial<Record<StatusFilter, TabLayout>>>({});
  const [x] = useState(() => new Animated.Value(0));
  const [width] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  const selectedLayout = layouts[value];

  const onTabLayout = (tab: StatusFilter) => (e: LayoutChangeEvent) => {
    const { x: tx, width: tw } = e.nativeEvent.layout;
    setLayouts((prev) =>
      prev[tab]?.x === tx && prev[tab]?.width === tw ? prev : { ...prev, [tab]: { x: tx, width: tw } },
    );
  };

  // 下線は、測れた最初だけ動かさずに置き、あとは選んだタブへすべらせる（動きを減らすときは即時）
  useEffect(() => {
    if (!selectedLayout) return;
    if (!placed.current || reduceMotion) {
      x.setValue(selectedLayout.x);
      width.setValue(selectedLayout.width);
      placed.current = true;
      return;
    }
    const options = { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    const anim = Animated.parallel([
      Animated.timing(x, { toValue: selectedLayout.x, ...options }),
      Animated.timing(width, { toValue: selectedLayout.width, ...options }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [selectedLayout, reduceMotion, x, width]);

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
            onLayout={onTabLayout(tab.value)}
            style={styles.tab}
          >
            <AppText variant="body" style={[styles.text, selected && styles.textSelected]}>
              {tab.label}
            </AppText>
            <AppText variant="label" style={styles.count}>
              {counts[tab.value]}
            </AppText>
          </Pressable>
        );
      })}
      {selectedLayout ? (
        <Animated.View
          testID="status-underline"
          pointerEvents="none"
          style={[styles.underline, { width, transform: [{ translateX: x }] }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: space[5],
    gap: space[5],
  },
  tab: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    marginBottom: -1,
  },
  underline: { position: 'absolute', left: 0, bottom: -1, height: UNDERLINE, backgroundColor: colors.ribbon },
  text: { lineHeight: 20 },
  textSelected: { fontFamily: resolveFontFamily(typography.value.fontFamily, typography.value.fontWeight) },
  count: { color: colors.textSecondary },
});
