import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

const TAB_MIN_WIDTH = 64;
const HOME_INDICATOR = 34;
const ICON_SIZE = 24;

type IconName = 'shelf' | 'stats' | 'settings';
const ICONS: Record<string, IconName> = {
  index: 'shelf',
  analytics: 'stats',
  settings: 'settings',
};

// View だけで描く小さなアイコン。本棚＝背表紙 3 冊、振り返り＝縦の棒、設定＝スライダー
function TabIcon({ name, color }: { name: IconName; color: string }) {
  if (name === 'shelf') {
    return (
      <View style={styles.icon}>
        {[14, 20, 17].map((h, i) => (
          <View key={i} style={{ width: 5, height: h, backgroundColor: color, borderRadius: 1 }} />
        ))}
      </View>
    );
  }
  if (name === 'stats') {
    return (
      <View style={styles.icon}>
        {[8, 16, 12, 20].map((h, i) => (
          <View key={i} style={{ width: 3, height: h, backgroundColor: color, borderRadius: 1 }} />
        ))}
      </View>
    );
  }
  return (
    <View style={[styles.icon, styles.sliders]}>
      {[6, 14].map((offset, i) => (
        <View key={i} style={styles.slider}>
          <View style={{ height: 2, backgroundColor: color }} />
          <View style={[styles.knob, { left: offset, backgroundColor: color }]} />
        </View>
      ))}
    </View>
  );
}

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
        const color = focused ? colors.textPrimary : colors.textTertiary;
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
            <TabIcon name={ICONS[route.name] ?? 'shelf'} color={color} />
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
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  sliders: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-around' },
  slider: { justifyContent: 'center' },
  knob: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
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
