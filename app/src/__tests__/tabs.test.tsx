import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { RECORDS_STORAGE_KEY } from '../lib/recordRepository';
import RootLayout from '../app/_layout';
import IsbnLookupRoute from '../app/record/isbn';
import TitleSearchRoute from '../app/record/search';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import SettingsRoute from '../app/(tabs)/settings';
import RecordsRoute from '../app/(tabs)/index';
import EditRecordRoute from '../app/record/[id]';
import NewRecordRoute from '../app/record/new';
import RereadRoute from '../app/records/[id]';

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
  '(tabs)/settings': SettingsRoute,
  'record/isbn': IsbnLookupRoute,
  'record/search': TitleSearchRoute,
  'record/new': NewRecordRoute,
  'record/[id]': EditRecordRoute,
  'records/[id]': RereadRoute,
};

describe('タブ構成', () => {
  beforeEach(async () => {
    await renderRouter(routes);
  });

  it('起動直後は本棚タブを表示し、タブが並ぶ', async () => {
    expect(await screen.findByText('最初の1冊を、棚に並べよう')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '本棚' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '振り返り' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: '記録' })).toBeNull();
    expect(screen.queryByText('分析')).toBeNull();
  });

  it('タブを押すと画面が切り替わる', async () => {
    await fireEvent.press(screen.getByRole('tab', { name: '振り返り' }));
    expect(await screen.findByText('読んだ本がたまると、ここに積み上がります')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: '本棚' }));
    expect(await screen.findByText('最初の1冊を、棚に並べよう')).toBeTruthy();
  });
});

describe('設定タブ', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('3 つ目のタブとして並び、押すと設定画面が開く', async () => {
    await renderRouter(routes);
    await screen.findByText('最初の1冊を、棚に並べよう');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('tab', { name: '設定' }));
    expect(await screen.findByText('ステータスの初期値')).toBeTruthy();
    expect(screen.queryByText('使う種別')).toBeNull();
    expect(screen.getByRole('tab', { name: '設定' }).props.accessibilityState.selected).toBe(true);
  });

  it('フォームに種別の選択肢はない', async () => {
    await renderRouter(routes);
    await act(async () => router.push('/record/new'));
    expect(await screen.findByLabelText('タイトル（必須）')).toBeTruthy();
    expect(screen.queryByText('種別')).toBeNull();
    expect(screen.queryByRole('radio', { name: '漫画' })).toBeNull();
  });
});

describe('分析タブの最新表示', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('記録を追加したあとに分析タブを開くと集計が表示される', async () => {
    await renderRouter(routes);
    await fireEvent.press(await screen.findByRole('button', { name: '本を追加' }));
    await fireEvent.press(await screen.findByRole('button', { name: '手で入力する' }));
    await fireEvent.changeText(await screen.findByLabelText('タイトル（必須）'), '分析用の本');
    await fireEvent.press(screen.getByRole('button', { name: '棚に並べる' }));
    expect((await screen.findAllByText('分析用の本')).length).toBeGreaterThan(0);
    await act(async () => router.replace('/'));
    await fireEvent.press(screen.getByRole('tab', { name: '振り返り' }));
    expect(await screen.findByText('月ごとに読んだ本')).toBeTruthy();
  });
});

describe('記録の追加', () => {
  it('追加 → フォーム → 保存 → 一覧に反映される', async () => {
    await renderRouter(routes);
    await fireEvent.press((await screen.findByRole('button', { name: '本を追加' })));
    await fireEvent.press(await screen.findByRole('button', { name: '手で入力する' }));
    await fireEvent.changeText(await screen.findByLabelText('タイトル（必須）'), '統合テストの本');
    await fireEvent.press(screen.getByRole('button', { name: '棚に並べる' }));
    expect((await screen.findAllByText('統合テストの本')).length).toBeGreaterThan(0);
    await act(async () => router.replace('/'));
    expect((await screen.findAllByLabelText(/^統合テストの本、/)).length).toBeGreaterThan(0);
  });
});

describe('手入力で追加（追加シート）', () => {
  it('追加シートの「手で入力する」を押すと追加フォームが表示される', async () => {
    await renderRouter(routes);
    await fireEvent.press((await screen.findByRole('button', { name: '本を追加' })));
    await fireEvent.press(await screen.findByRole('button', { name: '手で入力する' }));
    expect(await screen.findByLabelText('タイトル（必須）')).toBeTruthy();
    expect(screen.getByRole('button', { name: '棚に並べる' })).toBeTruthy();
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
    await fireEvent.press((await screen.findByRole('button', { name: '本を追加' })));
    await fireEvent.press(await screen.findByRole('button', { name: 'ISBN を入力する' }));
    await fireEvent.changeText(await screen.findByLabelText('ISBN（10 桁または 13 桁）'), '978-4-06-519981-7');
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    expect(await screen.findByDisplayValue('取得した本')).toBeTruthy();
    expect(screen.getByDisplayValue('著者A')).toBeTruthy();
    expect(screen.getByDisplayValue('出版社B')).toBeTruthy();
    expect(screen.getByDisplayValue('9784065199817')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '棚に並べる' }));
    await waitFor(() => expect(screen.getAllByText('取得した本').length).toBeGreaterThan(0));
    const raw = await AsyncStorage.getItem(RECORDS_STORAGE_KEY);
    const saved: unknown = raw === null ? null : JSON.parse(raw);
    return Array.isArray(saved) ? saved : [];
  }

  it('取得結果がフォームに入力済みで表示され、coverUrl も含めて（kind なしで）保存される', async () => {
    const saved = await lookupAndSave('https://example.com/c.jpg');
    expect(saved).toHaveLength(1);
    expect(saved[0]).not.toHaveProperty('kind');
    expect(saved[0]).toMatchObject({
      title: '取得した本',
      coverUrl: 'https://example.com/c.jpg',
    });
  });

  it('表紙画像がない場合は coverUrl が null で保存される', async () => {
    const saved = await lookupAndSave('');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ coverUrl: null });
  });
});

describe('タイトルで探して追加', () => {
  const original = globalThis.fetch;
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<channel><title>search</title>
<item><title>候補の本</title><author>著者C 著</author><dc:publisher>出版社D</dc:publisher><dc:date>2020</dc:date>
<dc:identifier xsi:type="dcndl:ISBN">9784065199817</dc:identifier></item>
</channel></rss>`;

  afterEach(() => {
    globalThis.fetch = original;
  });

  it('候補を選ぶと（openBD に無くても）候補の情報がフォームに入力済みで表示される', async () => {
    globalThis.fetch = jest.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes('openbd')) return { ok: true, json: async () => [null] } as Response;
      return { ok: true, text: async () => rss } as Response;
    });
    await renderRouter(routes);
    await fireEvent.press((await screen.findByRole('button', { name: '本を追加' })));
    await fireEvent.press(await screen.findByRole('button', { name: 'タイトルで探す' }));
    await fireEvent.changeText(await screen.findByLabelText('タイトルのキーワード'), '候補');
    await fireEvent.press(screen.getByRole('button', { name: '検索' }));
    await fireEvent.press(await screen.findByRole('button', { name: /候補の本/ }));
    expect(await screen.findByDisplayValue('候補の本')).toBeTruthy();
    expect(screen.getByDisplayValue('著者C 著')).toBeTruthy();
    expect(screen.getByDisplayValue('出版社D')).toBeTruthy();
    expect(screen.getByDisplayValue('9784065199817')).toBeTruthy();
  });
});

describe('振り返りタブの遷移', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('空表示の「本を追加する」→「手で入力する」で記録の追加画面へ移る', async () => {
    await renderRouter(routes);
    await fireEvent.press(screen.getByRole('tab', { name: '振り返り' }));
    await fireEvent.press((await screen.findAllByRole('button', { name: '本を追加する' })).slice(-1)[0]);
    await fireEvent.press(await screen.findByRole('button', { name: '手で入力する' }));
    await waitFor(() => expect(screen).toHavePathname('/record/new'));
  });
});
