import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { RECORDS_STORAGE_KEY } from '../lib/recordRepository';
import RootLayout from '../app/_layout';
import IsbnLookupRoute from '../app/record/isbn';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import EditRecordRoute from '../app/record/[id]';
import NewRecordRoute from '../app/record/new';

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
  'record/isbn': IsbnLookupRoute,
  'record/new': NewRecordRoute,
  'record/[id]': EditRecordRoute,
};

describe('タブ構成', () => {
  beforeEach(async () => {
    await renderRouter(routes);
  });

  it('起動直後は記録一覧タブを表示し、2 つのタブが並ぶ', async () => {
    expect(await screen.findByText('まだ記録がありません')).toBeTruthy();
    expect(screen.getAllByText('記録一覧').length).toBeGreaterThan(0);
    expect(screen.getAllByText('分析').length).toBeGreaterThan(0);
  });

  it('タブを押すと画面が切り替わる', async () => {
    await fireEvent.press(screen.getByText('分析'));
    expect(screen.getByText('分析できる記録がまだありません')).toBeTruthy();
    await fireEvent.press(screen.getByText('記録一覧'));
    expect(await screen.findByText('まだ記録がありません')).toBeTruthy();
  });
});

describe('記録の追加', () => {
  it('追加 → フォーム → 保存 → 一覧に反映される', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByRole('button', { name: '追加' }));
    await fireEvent.changeText(await screen.findByLabelText('タイトル'), '統合テストの本');
    await fireEvent.press(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.getByText('統合テストの本')).toBeTruthy());
    expect(screen.getByText('本 ・ 読みたい')).toBeTruthy();
  });
});

describe('ISBN で探して追加', () => {
  const original = globalThis.fetch;

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = original;
  });

  async function lookupAndSave(cover: string): Promise<unknown[]> {
    globalThis.fetch = jest.fn(
      async () =>
        ({
          ok: true,
          json: async () => [
            {
              summary: {
                isbn: '9784065199817',
                title: '取得した本',
                author: '著者A',
                publisher: '出版社B',
                cover,
              },
            },
          ],
        }) as Response,
    );
    await renderRouter(routes);
    await fireEvent.press(await screen.findByRole('button', { name: 'ISBN で探して追加' }));
    await fireEvent.changeText(await screen.findByLabelText('ISBN'), '978-4-06-519981-7');
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    expect(await screen.findByDisplayValue('取得した本')).toBeTruthy();
    expect(screen.getByDisplayValue('著者A')).toBeTruthy();
    expect(screen.getByDisplayValue('出版社B')).toBeTruthy();
    expect(screen.getByDisplayValue('9784065199817')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.getByText('取得した本')).toBeTruthy());
    const raw = await AsyncStorage.getItem(RECORDS_STORAGE_KEY);
    const saved: unknown = raw === null ? null : JSON.parse(raw);
    return Array.isArray(saved) ? saved : [];
  }

  it('取得結果がフォームに入力済みで表示され、coverUrl も含めて種別「本」で保存される', async () => {
    const saved = await lookupAndSave('https://example.com/c.jpg');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      kind: 'book',
      title: '取得した本',
      coverUrl: 'https://example.com/c.jpg',
    });
  });

  it('表紙画像がない場合は coverUrl が null で保存される', async () => {
    const saved = await lookupAndSave('');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ kind: 'book', coverUrl: null });
  });
});
