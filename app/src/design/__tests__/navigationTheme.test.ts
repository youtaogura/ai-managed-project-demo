import { navigationTheme, stackScreenOptions, tabsScreenOptions } from '../navigationTheme';
import { colors } from '../tokens';

describe('navigationTheme', () => {
  it('dark ベースで背景と文字が tokens', () => {
    expect(navigationTheme.dark).toBe(true);
    expect(navigationTheme.colors.background).toBe(colors.bg);
    expect(navigationTheme.colors.text).toBe(colors.textPrimary);
  });

  it('Stack のオプション', () => {
    expect(stackScreenOptions.headerStyle.backgroundColor).toBe(colors.bg);
    expect(stackScreenOptions.headerTintColor).toBe(colors.textPrimary);
    expect(stackScreenOptions.contentStyle.backgroundColor).toBe(colors.bg);
  });

  it('Tabs のオプション', () => {
    expect(tabsScreenOptions.tabBarStyle.backgroundColor).toBe(colors.surface1);
    expect(tabsScreenOptions.tabBarActiveTintColor).toBe(colors.accent);
    expect(tabsScreenOptions.tabBarInactiveTintColor).toBe(colors.textSecondary);
    expect(tabsScreenOptions.headerStyle.backgroundColor).toBe(colors.bg);
    expect(tabsScreenOptions.headerTintColor).toBe(colors.textPrimary);
  });
});
