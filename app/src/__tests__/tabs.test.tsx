import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ルートディレクトリ内にテストを置くとルートとして扱われるため、src/__tests__ に置き、
// 実際のルートコンポーネントをファイルマップとして渡す
const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
};

describe('タブ構成', () => {
  beforeEach(async () => {
    await renderRouter(routes);
  });

  it('起動直後は記録一覧タブを表示し、2 つのタブが並ぶ', async () => {
    await waitFor(() => expect(screen.getByText('まだ記録がありません')).toBeTruthy());
    expect(screen.getAllByText('記録一覧').length).toBeGreaterThan(0);
    expect(screen.getAllByText('分析').length).toBeGreaterThan(0);
  });

  it('タブを押すと画面が切り替わる', async () => {
    await waitFor(() => expect(screen.getByText('まだ記録がありません')).toBeTruthy());
    await fireEvent.press(screen.getByText('分析'));
    expect(screen.getByText('分析できる記録がまだありません')).toBeTruthy();
    await fireEvent.press(screen.getByText('記録一覧'));
    await waitFor(() => expect(screen.getByText('まだ記録がありません')).toBeTruthy());
  });
});
