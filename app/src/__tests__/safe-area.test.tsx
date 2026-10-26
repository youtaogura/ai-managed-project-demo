import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import RecordsRoute from '../app/(tabs)/index';
import NewRecordRoute from '../app/record/new';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TOP = 47;
const insets = { top: TOP, left: 0, right: 0, bottom: 0 };

// ルーター内の SafeAreaProvider は既定でインセット 0 になるため、ルートレイアウトの外側で
// 上端インセットのある端末を再現する
function InsetRootLayout() {
  return (
    <SafeAreaInsetsContext.Provider value={insets}>
      <RootLayout />
    </SafeAreaInsetsContext.Provider>
  );
}

const routes = {
  _layout: InsetRootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  'record/new': NewRecordRoute,
};

function topSpace(style: unknown): number {
  const flat = StyleSheet.flatten(style as never) as {
    paddingTop?: number;
    marginTop?: number;
  } | null;
  return (flat?.paddingTop ?? 0) + (flat?.marginTop ?? 0);
}

describe('上端インセットのある端末（ヘッダー付き画面）', () => {
  it('記録一覧のコンテンツ先頭にインセット分の余白が加わらない', async () => {
    await renderRouter(routes);
    const empty = await screen.findByText('まだ記録がありません');
    let node = empty.parent;
    while (node) {
      expect(topSpace(node.props.style)).toBeLessThan(TOP);
      node = node.parent;
    }
  });

  it('「追加」ボタンが表示され、押すと記録の追加画面へ遷移する', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByRole('button', { name: '追加' }));
    expect(await screen.findByLabelText('タイトル')).toBeTruthy();
    expect(screen).toHavePathname('/record/new');
  });
});
