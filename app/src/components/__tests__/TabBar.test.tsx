import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TabBar } from '../TabBar';

function setup(index: number) {
  const navigateToTab = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const routes = [
    { key: 'a', name: 'index' },
    { key: 'b', name: 'analytics' },
    { key: 'c', name: 'settings' },
  ];
  const titles: Record<string, string> = { a: '本棚', b: '振り返り', c: '設定' };
  const props = {
    state: { index, routes },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: { title: titles[r.key] } }])),
    emitter: { emit },
    navigateToTab,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  return { props, navigateToTab };
}

describe('TabBar', () => {
  it('3 つのタブが出て、選択中が selected', async () => {
    await render(<TabBar {...setup(0).props} />);
    expect(screen.getByRole('tab', { name: '本棚', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '振り返り', selected: false })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '設定', selected: false })).toBeTruthy();
  });

  it('別のタブを押すと遷移し、選択中を押しても遷移しない', async () => {
    const { props, navigateToTab } = setup(0);
    await render(<TabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: '本棚' }));
    expect(navigateToTab).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('tab', { name: '設定' }));
    expect(navigateToTab).toHaveBeenCalledWith('c');
  });

  it('選択中のラベルだけ太く、未選択とフォントが変わる', async () => {
    await render(<TabBar {...setup(0).props} />);
    const font = (name: string) =>
      StyleSheet.flatten(screen.getByText(name).props.style).fontFamily;
    expect(font('本棚')).not.toBe(font('設定'));
    expect(font('振り返り')).toBe(font('設定'));
  });
});
