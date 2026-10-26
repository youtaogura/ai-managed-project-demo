import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import SettingsRoute from '../app/(tabs)/settings';
import DataRoute from '../app/data';
import { RECORDS_STORAGE_KEY } from '../lib/recordRepository';
import { makeRecord } from '../testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
  '(tabs)/settings': SettingsRoute,
  data: DataRoute,
};

describe('データ画面のルート配線', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify([makeRecord()]));
  });

  it('設定の「データ」行からデータ画面へ遷移し、戻れる', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByRole('button', { name: /^データ、/ }));
    await waitFor(() => expect(screen).toHavePathname('/data'));
    expect(await screen.findByText('記録の件数')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen).toHavePathname('/settings'));
  });
});
