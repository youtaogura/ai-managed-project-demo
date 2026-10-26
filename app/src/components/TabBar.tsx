import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

const TAB_MIN_WIDTH = 64;
const HOME_INDICATOR = 34;
const ICONS: Record<string, string> = {
  index: '▤',
  analytics: '▥',
  settings: '⚙',
};

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View
      role="tablist"
      style={[
        styles.bar,
        {
          height: size.tabbarHeight - HOME_INDICATOR + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const label = descriptors[route.key]?.options.title ?? route.name;
        const color = focused ? colors.accent : colors.textSecondary;
        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.tab}
          >
            <AppText variant="tab" style={{ color }}>
              {ICONS[route.name] ?? '●'}
            </AppText>
            <AppText variant="tab" style={{ color }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: {
    flex: 1,
    minWidth: TAB_MIN_WIDTH,
    minHeight: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
});
