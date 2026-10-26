import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import ReadingRoute from '../app/reading/[id]';
import RecordDetailRoute from '../app/records/[id]';
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
  'records/[id]': RecordDetailRoute,
  'reading/[id]': ReadingRoute,
  'record/new': () => <Text>ダミー追加画面</Text>,
  'record/[id]': () => <Text>ダミー編集画面</Text>,
};

describe('読んでる本のルート', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([
        makeRecord({ id: 'r1', title: '読んでる本', status: 'in_progress' }),
        makeRecord({ id: 'r2', title: '読んだ本', status: 'completed' }),
      ]),
    );
  });

  it('本棚で読んでる本をタップすると /reading/<id> を開く', async () => {
    await renderRouter(routes);
    await waitFor(() => expect(screen.getByLabelText(/^読んでる本、/)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    await waitFor(() => expect(screen.getByText('メモと引用')).toBeTruthy());
    expect(screen).toHavePathname('/reading/r1');
  });

  it('読んでる以外は /records/<id> を開く', async () => {
    await renderRouter(routes);
    await waitFor(() => expect(screen.getByLabelText(/^読んだ本、/)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(/^読んだ本、/));
    await waitFor(() => expect(screen).toHavePathname('/records/r2'));
  });

  it('戻ると本棚へ、編集で編集画面へ', async () => {
    await renderRouter(routes, { initialUrl: '/reading/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '編集' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '編集' }));
    await waitFor(() => expect(screen.getByText('ダミー編集画面')).toBeTruthy());
  });

  it('戻るボタンで本棚へ', async () => {
    await renderRouter(routes, { initialUrl: '/reading/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('「読み終えた」で completed にして /records/<id> へ置き換える', async () => {
    await renderRouter(routes, { initialUrl: '/reading/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '読み終えた' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '読み終えた' }));
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    const saved = JSON.parse((await AsyncStorage.getItem(RECORDS_STORAGE_KEY)) ?? '[]');
    expect(saved.find((r: { id: string }) => r.id === 'r1').status).toBe('completed');
  });
});
