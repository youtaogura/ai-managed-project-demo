import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import FinishedRoute from '../app/finished/[id]';
import RereadRoute from '../app/records/[id]';
import WriteRoute from '../app/write/[id]';
import { RECORDS_STORAGE_KEY } from '../lib/recordRepository';
import { makeRecord } from '../testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.setTimeout(15000);

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
  'records/[id]': RereadRoute,
  'finished/[id]': FinishedRoute,
  'write/[id]': WriteRoute,
  'record/[id]': () => <Text>ダミー編集画面</Text>,
};

describe('読み終えた・書き出しの続きのルート', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([makeRecord({ id: 'r1', title: '読んだ本', status: 'completed' })]),
    );
  });

  it('「記録を書く」で /write/<id> へ、「ここまでを残す」で /records/<id> へ', async () => {
    await renderRouter(routes, { initialUrl: '/finished/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '記録を書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '記録を書く' }));
    await waitFor(() => expect(screen).toHavePathname('/write/r1'));
    await waitFor(() => expect(screen.getByLabelText('ひとことで言うと、')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'よかった');
    await fireEvent.press(screen.getByRole('button', { name: 'ここまでを残す' }));
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    const saved = JSON.parse((await AsyncStorage.getItem(RECORDS_STORAGE_KEY)) ?? '[]');
    expect(saved[0].oneLiner).toBe('よかった');
  });

  it('「あとで書く」で本棚へ', async () => {
    await renderRouter(routes, { initialUrl: '/finished/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'あとで書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'あとで書く' }));
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('書く画面の「あとで」で本棚へ', async () => {
    await renderRouter(routes, { initialUrl: '/write/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'あとで' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'あとで' }));
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('読み返す画面の入口から /write/<id> へ push する', async () => {
    await renderRouter(routes, { initialUrl: '/records/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '書き出しの続きを書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '書き出しの続きを書く' }));
    await waitFor(() => expect(screen).toHavePathname('/write/r1'));
  });

  it('読み返す画面から開いた書き出しの「あとで」で読み返す画面に戻る', async () => {
    await renderRouter(routes, { initialUrl: '/records/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '書き出しの続きを書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '書き出しの続きを書く' }));
    await waitFor(() => expect(screen.getByLabelText('ひとことで言うと、')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), '途中');
    await fireEvent.press(screen.getByRole('button', { name: 'あとで' }));
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    const saved = JSON.parse((await AsyncStorage.getItem(RECORDS_STORAGE_KEY)) ?? '[]');
    expect(saved).toHaveLength(1);
  });

  it('読み終えた直後から開いた書き出しの「あとで」で本棚へ', async () => {
    await renderRouter(routes, { initialUrl: '/finished/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '記録を書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '記録を書く' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'あとで' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'あとで' }));
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});
