import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import SettingsRoute from '../app/(tabs)/settings';
import StartersRoute from '../app/starters';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
  '(tabs)/settings': SettingsRoute,
  starters: StartersRoute,
};

describe('書き出し画面のルート配線', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('設定の「書き出し」行から画面へ遷移し、戻れる', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByRole('button', { name: /^書き出し、オン · 一度に 3 つ/ }));
    await waitFor(() => expect(screen).toHavePathname('/starters'));
    expect(await screen.findByText('読み終えたら書き出しを出す')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen).toHavePathname('/settings'));
  });
});
