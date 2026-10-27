import { DefaultTheme } from 'expo-router';

import { colors } from './tokens';

export const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.textPrimary,
    border: colors.line,
    notification: colors.accent,
  },
};

// ネイティブのヘッダーは使わない（見た目をそろえるため、各画面が ScreenHeaderBar などで自分で描く）
export const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
};

export const tabsScreenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary },
  tabBarStyle: { backgroundColor: colors.surface1, borderTopColor: colors.line },
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textSecondary,
  sceneStyle: { backgroundColor: colors.bg },
};
