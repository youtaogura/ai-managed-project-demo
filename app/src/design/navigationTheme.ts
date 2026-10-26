import { DarkTheme } from 'expo-router';

import { colors } from './tokens';

export const navigationTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.textPrimary,
    border: colors.line,
    notification: colors.accent,
  },
};

export const stackScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { color: colors.textPrimary },
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
