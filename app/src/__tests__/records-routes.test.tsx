import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import RereadRoute from '../app/records/[id]';
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
  'records/[id]': RereadRoute,
  // #3 が実装するルートの代わりのダミー
  'record/new': () => <Text>ダミー追加画面</Text>,
  'record/[id]': () => <Text>ダミー編集画面</Text>,
  'write/[id]': () => <Text>ダミー書く画面</Text>,
};

describe('記録のルート配線', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([makeRecord({ id: 'r1', title: '吾輩は猫である' })]),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('一覧 → 詳細 → 編集へ遷移できる', async () => {
    await renderRouter(routes);
    await waitFor(() => expect(screen.getByLabelText(/^吾輩は猫である、/)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(/^吾輩は猫である、/));
    await waitFor(() => expect(screen.getByText('編集')).toBeTruthy());
    expect(screen).toHavePathname('/records/r1');
    await fireEvent.press(screen.getByText('編集'));
    await waitFor(() => expect(screen.getByText('ダミー編集画面')).toBeTruthy());
  });

  it('振り返りのお気に入りの背表紙から詳細へ遷移する', async () => {
    const year = new Date().getFullYear();
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([
        makeRecord({ id: 'r1', title: '吾輩は猫である', favorite: true, endDate: `${year}-01-05` }),
      ]),
    );
    await renderRouter(routes, { initialUrl: '/analytics' });
    await fireEvent.press(await screen.findByLabelText(/^吾輩は猫である、/));
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
  });

  it('＋ボタンの追加シートから手入力の追加画面へ遷移する', async () => {
    await renderRouter(routes);
    await waitFor(() => expect(screen.getByLabelText(/^吾輩は猫である、/)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '本を追加' }));
    await fireEvent.press(screen.getByRole('button', { name: '手で入力する' }));
    await waitFor(() => expect(screen.getByText('ダミー追加画面')).toBeTruthy());
  });

  it('0 件のときの「記録する」から追加シート経由で追加画面へ遷移する', async () => {
    await AsyncStorage.clear();
    await renderRouter(routes);
    await waitFor(() => expect(screen.getByText('最初の1冊を、棚に並べよう')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '本を追加する' }));
    await fireEvent.press(screen.getByRole('button', { name: '手で入力する' }));
    await waitFor(() => expect(screen.getByText('ダミー追加画面')).toBeTruthy());
  });

  it('読み返す画面の「読後メモを書く」で書く画面へ遷移する', async () => {
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([makeRecord({ id: 'r1', title: '吾輩は猫である', status: 'completed' })]),
    );
    await renderRouter(routes, { initialUrl: '/records/r1' });
    await fireEvent.press(await screen.findByRole('button', { name: '読後メモを書く' }));
    await waitFor(() => expect(screen.getByText('ダミー書く画面')).toBeTruthy());
    expect(screen).toHavePathname('/write/r1');
  });

  it('存在しない id では本棚へ戻るボタンで一覧に戻る', async () => {
    await renderRouter(routes, { initialUrl: '/records/none' });
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
    await fireEvent.press(screen.getByText('本棚へ戻る'));
    await waitFor(() => expect(screen.getByLabelText(/^吾輩は猫である、/)).toBeTruthy());
  });
});
