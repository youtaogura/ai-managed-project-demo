import { StyleSheet, Text } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
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

describe('上端インセットのある端末（タブの画面はヘッダーなし）', () => {
  it('記録一覧の見出しの上に、インセット分の余白がちょうど 1 回だけ入る', async () => {
    await renderRouter(routes);
    const title = await screen.findByText('最初の1冊を、棚に並べよう');
    let total = 0;
    let node = title.parent;
    while (node) {
      total += topSpace(node.props.style);
      node = node.parent;
    }
    expect(total).toBe(TOP);
  });

  it('「記録する」から手で入力すると、記録の追加画面へ遷移する', async () => {
    await renderRouter(routes);
    await screen.findByText('最初の1冊を、棚に並べよう');
    await fireEvent.press(screen.getByRole('button', { name: '本を追加する' }));
    await fireEvent.press(await screen.findByRole('button', { name: '手で入力する' }));
    expect(await screen.findByLabelText('タイトル（必須）')).toBeTruthy();
    expect(screen).toHavePathname('/record/new');
  });
});

describe('EXPO_PUBLIC_PREVIEW_INSETS', () => {
  const original = process.env.EXPO_PUBLIC_PREVIEW_INSETS;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_PREVIEW_INSETS;
    else process.env.EXPO_PUBLIC_PREVIEW_INSETS = original;
  });

  function Probe() {
    const i = useSafeAreaInsets();
    return <Text>{`${i.top},${i.right},${i.bottom},${i.left}`}</Text>;
  }

  it('有効な値ならルートレイアウト配下の余白になる', async () => {
    process.env.EXPO_PUBLIC_PREVIEW_INSETS = '59,0,34,0';
    await renderRouter({ _layout: RootLayout, index: Probe });
    expect(await screen.findByText('59,0,34,0')).toBeTruthy();
  });

  it('不正な値なら余白を上書きしない', async () => {
    process.env.EXPO_PUBLIC_PREVIEW_INSETS = 'x';
    await renderRouter({ _layout: RootLayout, index: Probe });
    expect(await screen.findByText('0,0,0,0')).toBeTruthy();
  });
});
