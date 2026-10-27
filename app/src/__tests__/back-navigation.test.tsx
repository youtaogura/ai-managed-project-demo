import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import FinishedRoute from '../app/finished/[id]';
import ReadingRoute from '../app/reading/[id]';
import EditRoute from '../app/record/[id]';
import RereadRoute from '../app/records/[id]';
import WriteRoute from '../app/write/[id]';
import { RECORDS_STORAGE_KEY } from '../lib/recordRepository';
import { makeRecord } from '../testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.setTimeout(20000);

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
  'records/[id]': RereadRoute,
  'reading/[id]': ReadingRoute,
  'finished/[id]': FinishedRoute,
  'write/[id]': WriteRoute,
  'record/[id]': EditRoute,
};

const shelfLabel = /^読んだ本、/;

async function press(name: string) {
  await waitFor(() => expect(screen.getByRole('button', { name })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name }));
}

describe('戻る動きの履歴', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([
        makeRecord({ id: 'r1', title: '読んだ本', status: 'completed' }),
        makeRecord({ id: 'r2', title: '読んでる本', status: 'in_progress' }),
      ]),
    );
  });

  it('本棚 → 本 →「‹」で本棚へ戻り、履歴に本が残らない', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(shelfLabel));
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('本棚 → 読み中 →「‹」で本棚へ戻る', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(/^読んでる本、/));
    await waitFor(() => expect(screen).toHavePathname('/reading/r2'));
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('直接開いた本の「‹」で本棚へ向かう', async () => {
    await renderRouter(routes, { initialUrl: '/records/r1' });
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('本棚 → 本 → 編集 → 保存 → 本 →「‹」で本棚へ戻る', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(shelfLabel));
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    await press('編集');
    await waitFor(() => expect(screen).toHavePathname('/record/r1'));
    await press('保存する');
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('編集で読んでるに変えて保存すると、読み中の画面から「‹」で本棚へ戻る', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(shelfLabel));
    await press('編集');
    await fireEvent.press(await screen.findByRole('radio', { name: '読んでる' }));
    await press('保存する');
    await waitFor(() => expect(screen).toHavePathname('/reading/r1'));
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('本棚 → 本 → 編集 → 削除で本棚へ戻り、削除した本に戻らない', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(shelfLabel));
    await press('編集');
    await press('この本を削除');
    await press('削除する');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('本棚 → 読み中 → 読み終えた →「あとで書く」で本棚へ戻り、途中の画面に戻らない', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(/^読んでる本、/));
    await press('読み終えた');
    await waitFor(() => expect(screen).toHavePathname('/finished/r2'));
    await press('あとで書く');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('読み終えた → 書く → 保存のあと、途中の画面に戻らない', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(/^読んでる本、/));
    await press('読み終えた');
    await press('記録を書く');
    await waitFor(() => expect(screen.getByLabelText('ひとことで言うと、')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'よかった');
    await press('ここまでを残す');
    await waitFor(() => expect(screen).toHavePathname('/records/r2'));
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('読み返す画面から書いて保存すると、同じ本の画面が重ならない', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(shelfLabel));
    await press('書き出しの続きを書く');
    await waitFor(() => expect(screen.getByLabelText('ひとことで言うと、')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'よかった');
    await press('ここまでを残す');
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
    await press('戻る');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });

  it('書く画面の「あとで」: 再読なら戻る、直接開いたなら本棚へ', async () => {
    await renderRouter(routes, { initialUrl: '/write/r1' });
    await press('あとで');
    await waitFor(() => expect(screen).toHavePathname('/'));
    await act(async () => router.push('/records/r1'));
    await act(async () => router.push({ pathname: '/write/[id]', params: { id: 'r1', from: 'reread' } }));
    await press('あとで');
    await waitFor(() => expect(screen).toHavePathname('/records/r1'));
  });
});
