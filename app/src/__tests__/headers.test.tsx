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
    ['/', '記録'],
    ['/analytics', '振り返り'],
  ])('%s の見出しは「%s」', async (path, title) => {
    await renderRouter(routes, { initialUrl: path });
    await waitFor(() => expect(screen.getAllByText(title).length).toBeGreaterThan(0));
    expect(screen).toHavePathname(path);
  });
});

describe('全画面でヘッダーが表示される', () => {
  it.each([
    ['/records/r1', '記録の詳細'],
    ['/record/new', '記録を追加'],
    ['/record/isbn', 'ISBN で探す'],
    ['/record/scan', 'バーコードを読み取る'],
    ['/record/r1', '記録を編集'],
  ])('%s のヘッダータイトルは「%s」', async (path, title) => {
    await renderRouter(routes, { initialUrl: path });
    await waitFor(() => expect(hasHeaderTitle(title)).toBe(true));
    expect(screen).toHavePathname(path);
  });

  it('ISBN 入力画面へヘッダー付きで遷移する', async () => {
    await renderRouter(routes);
    await act(async () => router.push('/record/isbn'));
    await waitFor(() => expect(hasHeaderTitle('ISBN で探す')).toBe(true));
    expect(screen).toHavePathname('/record/isbn');
  });
});
