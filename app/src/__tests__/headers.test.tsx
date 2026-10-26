import { router } from 'expo-router';
import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import AnalyticsRoute from '../app/(tabs)/analytics';
import RecordsRoute from '../app/(tabs)/index';
import EditRecordRoute from '../app/record/[id]';
import IsbnLookupRoute from '../app/record/isbn';
import NewRecordRoute from '../app/record/new';
import BarcodeScanRoute from '../app/record/scan';
import TitleSearchRoute from '../app/record/search';
import RecordDetailRoute from '../app/records/[id]';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-camera', () => ({
  CameraView: () => jest.requireActual('react').createElement('View', { testID: 'camera' }),
  useCameraPermissions: () => [
    { granted: true, canAskAgain: true },
    jest.fn(),
  ],
}));

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': RecordsRoute,
  '(tabs)/analytics': AnalyticsRoute,
  'records/[id]': RecordDetailRoute,
  'record/new': NewRecordRoute,
  'record/isbn': IsbnLookupRoute,
  'record/scan': BarcodeScanRoute,
  'record/search': TitleSearchRoute,
  'record/[id]': EditRecordRoute,
};


function containsTitle(node: unknown, title: string): boolean {
  if (Array.isArray(node)) return node.some((child) => containsTitle(child, title));
  if (typeof node !== 'object' || node === null) return false;
  const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
  return props?.title === title || containsTitle(children, title);
}

// ネイティブスタックのヘッダーは title プロパティ、Tabs のヘッダーはテキストとして描画される
function hasHeaderTitle(title: string): boolean {
  return containsTitle(screen.toJSON(), title) || screen.queryAllByText(title).length > 0;
}

describe('タブの画面はネイティブのヘッダーを出さず、画面内の見出しにする', () => {
  it.each([
    ['/', '本棚'],
    ['/analytics', '振り返り'],
  ])('%s の見出しは「%s」', async (path, title) => {
    await renderRouter(routes, { initialUrl: path });
    await waitFor(() => expect(screen.getAllByText(title).length).toBeGreaterThan(0));
    expect(screen).toHavePathname(path);
  });
});

describe('全画面でヘッダーが表示される', () => {
  it.each([
    ['/record/new', '記録を追加'],
    ['/record/r1', '記録を編集'],
  ])('%s のヘッダータイトルは「%s」', async (path, title) => {
    await renderRouter(routes, { initialUrl: path });
    await waitFor(() => expect(hasHeaderTitle(title)).toBe(true));
    expect(screen).toHavePathname(path);
  });

  it('詳細はヘッダーを出さない', async () => {
    await renderRouter(routes, { initialUrl: '/records/r1' });
    await waitFor(() => expect(screen.getByText('記録が見つかりません')).toBeTruthy());
    expect(hasHeaderTitle('記録の詳細')).toBe(false);
    expect(screen).toHavePathname('/records/r1');
  });

  it('記録一覧から ISBN 入力画面へ、ネイティブヘッダーなしで画面内の上部バーで遷移する', async () => {
    await renderRouter(routes);
    await act(async () => router.push('/record/isbn'));
    await waitFor(() => expect(screen.queryAllByText('ISBN を入力する').length).toBeGreaterThan(0));
    expect(hasHeaderTitle('ISBN で探す')).toBe(false);
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    expect(screen).toHavePathname('/record/isbn');
  });
});

describe('探す 3 画面はネイティブヘッダーを出さず、画面内にタイトルを持つ', () => {
  it.each([
    ['/record/scan', 'バーコードを読み取る', 'バーコードで読み取る'],
    ['/record/isbn', 'ISBN を入力する', 'ISBN で探す'],
    ['/record/search', '閉じる', 'タイトルで探す'],
  ])('%s', async (path, inScreen, nativeTitle) => {
    await renderRouter(routes, { initialUrl: path });
    await waitFor(() => expect(screen.queryAllByText(inScreen).length + screen.queryAllByLabelText(inScreen).length).toBeGreaterThan(0));
    expect(containsTitle(screen.toJSON(), nativeTitle)).toBe(false);
    expect(screen).toHavePathname(path);
  });

  it('isbn / notFound パラメータを ISBN 画面に渡す', async () => {
    await renderRouter(routes, { initialUrl: '/record/isbn?isbn=9784065199817&notFound=1' });
    await waitFor(() => expect(screen.queryAllByText('見つかりませんでした').length).toBeGreaterThan(0));
    expect(screen.getByLabelText('ISBN（10 桁または 13 桁）').props.value).toBe('9784065199817');
  });

  it('パラメータなしなら空の通常状態で開く', async () => {
    await renderRouter(routes, { initialUrl: '/record/isbn' });
    await waitFor(() => expect(screen.getByLabelText('ISBN（10 桁または 13 桁）').props.value).toBe(''));
    expect(screen.queryByText('見つかりませんでした')).toBeNull();
  });
});
