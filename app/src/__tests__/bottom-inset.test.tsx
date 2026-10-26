import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { RecordForm } from '../components/RecordForm';
import { BookLookupContextProvider } from '../hooks/useBookLookup';
import { CoverResolverContextProvider } from '../hooks/useCoverResolver';
import { BookSearchContextProvider } from '../hooks/useBookSearch';
import { PhotoServiceContextProvider } from '../hooks/usePhotoService';
import { RecordRepositoryProvider } from '../hooks/useRecordRepository';
import { BarcodeScanScreen } from '../screens/BarcodeScanScreen';
import { RecordDetailScreen } from '../screens/RecordDetailScreen';
import { TitleSearchScreen } from '../screens/TitleSearchScreen';
import { size, space } from '../design/tokens';
import { createFakeRepository, createMockPhotoService, makeRecord } from '../testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

jest.mock('expo-camera', () => ({
  CameraView: () => jest.requireActual('react').createElement('View', { testID: 'camera' }),
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
}));

type Padded = { paddingBottom?: number };

function withInsets(bottom: number, ui: ReactElement) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 59, left: 0, right: 0, bottom }}>
      <PhotoServiceContextProvider service={createMockPhotoService()}>{ui}</PhotoServiceContextProvider>
    </SafeAreaInsetsContext.Provider>
  );
}

// 指定テキストの祖先から、contentContainerStyle を持つスクロール領域の paddingBottom を得る
function scrollPaddingBottom(text: string | RegExp): number | undefined {
  let node = screen.getByText(text).parent;
  while (node) {
    if (node.props.contentContainerStyle !== undefined) {
      return (StyleSheet.flatten(node.props.contentContainerStyle) as Padded).paddingBottom;
    }
    node = node.parent;
  }
  return undefined;
}

function overlayPaddingBottom(text: string | RegExp): number | undefined {
  let node = screen.getByText(text).parent;
  while (node) {
    const padding = (StyleSheet.flatten(node.props.style) as Padded | null)?.paddingBottom;
    if (padding !== undefined) return padding;
    node = node.parent;
  }
  return undefined;
}

describe.each([
  [34, 34],
  [0, 0],
])('下端インセット %i', (bottom, extra) => {
  it('記録フォームの主ボタン領域の下端にインセットが加わる', async () => {
    await render(withInsets(bottom, <RecordForm onSubmit={jest.fn()} />));
    let node = (await screen.findByRole('button', { name: '棚に並べる' })).parent;
    let padding: number | undefined;
    while (node && padding === undefined) {
      padding = (StyleSheet.flatten(node.props.style) as Padded | undefined)?.paddingBottom;
      node = node.parent;
    }
    expect(padding).toBe(space[3] + extra);
  });

  it('記録の詳細の末尾余白にインセットが加わる', async () => {
    const { repository } = createFakeRepository([makeRecord({ id: 'x', title: '吾輩は猫である' })]);
    await render(
      withInsets(
        bottom,
        <RecordRepositoryProvider repository={repository}>
          <CoverResolverContextProvider resolver={async () => null}>
            <RecordDetailScreen recordId="x" />
          </CoverResolverContextProvider>
        </RecordRepositoryProvider>,
      ),
    );
    await screen.findByText('ステータス');
    expect(scrollPaddingBottom('ステータス')).toBe(size.buttonHeight + space[4] * 2 + space[6] + extra);
  });

  it('バーコード読み取りのオーバーレイ下端にインセットが加わる', async () => {
    await render(
      withInsets(
        bottom,
        <BookLookupContextProvider provider={{ lookupByIsbn: jest.fn() }}>
          <CoverResolverContextProvider resolver={async () => null}>
            <BarcodeScanScreen />
          </CoverResolverContextProvider>
        </BookLookupContextProvider>,
      ),
    );
    await screen.findByText('ISBN を手入力する');
    expect(overlayPaddingBottom('ISBN を手入力する')).toBe(space[4] + extra);
  });

  it('タイトル検索の固定フッター下端にインセットが加わる', async () => {
    const search = jest.fn(async () => ({
      status: 'ok' as const,
      candidates: [{ title: '本A', author: null, publisher: null, publishedYear: null, isbn: null, ndlId: null }],
    }));
    await render(
      withInsets(
        bottom,
        <BookLookupContextProvider provider={{ lookupByIsbn: jest.fn() }}>
          <BookSearchContextProvider provider={{ attribution: '表記', search }}>
            <CoverResolverContextProvider resolver={async () => null}>
              <TitleSearchScreen />
            </CoverResolverContextProvider>
          </BookSearchContextProvider>
        </BookLookupContextProvider>,
      ),
    );
    fireEvent.changeText(await screen.findByLabelText('タイトルのキーワード'), '本');
    const button = await screen.findByRole('button', { name: /検索/ });
    await act(async () => fireEvent.press(button));
    await screen.findByRole('button', { name: '本A' });
    expect(overlayPaddingBottom('見つからないので手で入力する')).toBe(space[3] + extra);
  });
});
