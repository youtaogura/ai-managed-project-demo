import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import SettingsRoute from '../app/(tabs)/settings';
import ShelvesRoute from '../app/shelves';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
  '(tabs)/settings': SettingsRoute,
  shelves: ShelvesRoute,
};

describe('本棚の管理画面のルート配線', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('設定の「本棚の管理」行から画面へ遷移し、戻れる', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByRole('button', { name: /^本棚の管理、/ }));
    await waitFor(() => expect(screen).toHavePathname('/shelves'));
    expect(await screen.findByText('まだ本棚がありません')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen).toHavePathname('/settings'));
  });
});
