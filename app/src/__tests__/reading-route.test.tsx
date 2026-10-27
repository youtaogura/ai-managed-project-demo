import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import ReadingRoute from '../app/reading/[id]';
import NewRecordRoute from '../app/record/new';
import RereadRoute from '../app/records/[id]';
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
  'reading/[id]': ReadingRoute,
  'finished/[id]': () => <Text>ダミー読み終えた画面</Text>,
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

  it('「読み終えた」で completed にして /finished/<id> へ置き換える', async () => {
    await renderRouter(routes, { initialUrl: '/reading/r1' });
    await waitFor(() => expect(screen.getByRole('button', { name: '読み終えた' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '読み終えた' }));
    await waitFor(() => expect(screen).toHavePathname('/finished/r1'));
    const saved = JSON.parse((await AsyncStorage.getItem(RECORDS_STORAGE_KEY)) ?? '[]');
    expect(saved.find((r: { id: string }) => r.id === 'r1').status).toBe('completed');
  });
});

describe('本を開く入口の遷移先', () => {
  const year = new Date().getFullYear();

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      RECORDS_STORAGE_KEY,
      JSON.stringify([
        makeRecord({ id: 'r1', title: '読んでる本', status: 'in_progress' }),
        makeRecord({ id: 'r2', title: '読んだ本', status: 'completed' }),
        makeRecord({ id: 'r3', title: '読みたい本', status: 'planned' }),
        makeRecord({ id: 'r4', title: 'やめた本', status: 'dropped' }),
        makeRecord({
          id: 'f1',
          title: '好きな読了本',
          status: 'completed',
          favorite: true,
          endDate: `${year}-01-05`,
        }),
        makeRecord({
          id: 'f2',
          title: '好きな読書中本',
          status: 'in_progress',
          favorite: true,
          endDate: `${year}-01-06`,
        }),
      ]),
    );
  });

  it.each([
    ['読んだ本', '/records/r2'],
    ['読みたい本', '/records/r3'],
    ['やめた本', '/records/r4'],
  ])('本棚で「%s」を開くと %s', async (title, path) => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByLabelText(new RegExp(`^${title}、`)));
    await waitFor(() => expect(screen).toHavePathname(path));
  });

  it('絞り込み中も同じ遷移になる', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByRole('tab', { name: /^読んでる / }));
    await fireEvent.press(await screen.findByLabelText(/^読んでる本、/));
    await waitFor(() => expect(screen).toHavePathname('/reading/r1'));
  });

  it('絞り込み中の読み終えた本は読み返す画面を開く', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByRole('tab', { name: /^読んだ / }));
    await fireEvent.press(await screen.findByLabelText(/^読んだ本、/));
    await waitFor(() => expect(screen).toHavePathname('/records/r2'));
  });

  it('振り返りのお気に入り: 読み終えた本は /records/<id>', async () => {
    await renderRouter(routes, { initialUrl: '/analytics' });
    await fireEvent.press(await screen.findByLabelText(/^好きな読了本、/));
    await waitFor(() => expect(screen).toHavePathname('/records/f1'));
  });

  it('振り返りのお気に入り: 読んでる本は /reading/<id>', async () => {
    await renderRouter(routes, { initialUrl: '/analytics' });
    await fireEvent.press(await screen.findByLabelText(/^好きな読書中本、/));
    await waitFor(() => expect(screen).toHavePathname('/reading/f2'));
  });
});

describe('登録後の遷移先', () => {
  const newRoutes = { ...routes, 'record/new': NewRecordRoute };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it.each([
    ['読んでる', '/reading/'],
    ['読みたい', '/records/'],
  ])('状態「%s」で登録すると %s<id> が開く', async (label, prefix) => {
    await renderRouter(newRoutes, { initialUrl: '/record/new' });
    await fireEvent.changeText(await screen.findByLabelText('タイトル（必須）'), '新しい本');
    await fireEvent.press(screen.getByRole('radio', { name: label }));
    await fireEvent.press(screen.getByRole('button', { name: '棚に並べる' }));
    await waitFor(() => expect(screen).not.toHavePathname('/record/new'));
      const saved = JSON.parse((await AsyncStorage.getItem(RECORDS_STORAGE_KEY)) ?? '[]');
    expect(saved).toHaveLength(1);
    expect(screen).toHavePathname(`${prefix}${saved[0].id}`);
  });
});

describe('古い詳細画面のコード', () => {
  it('app/src に残っていない', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    // このファイル自身に名前が出ないよう、文字列を分けて組み立てる
    const names = ['RecordDetail' + 'Screen', 'Info' + 'Cell', 'RecordInfo' + 'Section', 'infoCell' + 'Labels', 'record' + 'Info', 'hero' + 'Color'];
    const root = path.resolve(__dirname, '..');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
      );
    const found = walk(root).filter((f) => {
      if (!/\.(ts|tsx)$/.test(f)) return false;
      const text = fs.readFileSync(f, 'utf8');
      return names.some((n) => text.includes(n));
    });
    expect(found).toEqual([]);
  });
});
