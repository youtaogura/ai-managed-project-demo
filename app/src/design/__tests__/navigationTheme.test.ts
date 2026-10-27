import { navigationTheme, stackScreenOptions, tabsScreenOptions } from '../navigationTheme';
import { colors } from '../tokens';

describe('navigationTheme', () => {
  it('light ベースで背景と文字が tokens', () => {
    expect(navigationTheme.dark).toBe(false);
    expect(navigationTheme.colors.background).toBe(colors.bg);
    expect(navigationTheme.colors.text).toBe(colors.textPrimary);
  });

  it('Stack のオプション: ネイティブのヘッダーは出さず、地は紙の色', () => {
    expect(stackScreenOptions.headerShown).toBe(false);
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
