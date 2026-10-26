import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BookLookupContextProvider } from '../../hooks/useBookLookup';
import type { BookLookupProvider } from '../../lib/bookLookup/BookLookupProvider';
import type { BookLookupResult } from '../../types/book';
import { BarcodeScanScreen } from '../BarcodeScanScreen';

type ScanHandler = (scan: { type: string; data: string }) => void;
type CameraProps = {
  onBarcodeScanned?: ScanHandler;
  barcodeScannerSettings?: unknown;
};

let mockCameraProps: CameraProps | null = null;
let mockPermission: { granted: boolean; canAskAgain: boolean } | null = null;
const mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => ({
  CameraView: (props: CameraProps) => {
    mockCameraProps = props;
    return jest.requireActual('react').createElement('View', { testID: 'camera' });
  },
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
}));

const ISBN = '9784065199817';
const book = { isbn: ISBN, title: 'T', author: 'A', publisher: 'P', coverUrl: 'U' };

async function setup(results: Promise<BookLookupResult>[] = []) {
  const lookupByIsbn = jest.fn();
  results.forEach((r) => lookupByIsbn.mockReturnValueOnce(r));
  const provider: BookLookupProvider = { lookupByIsbn };
  const view = await render(
    <BookLookupContextProvider provider={provider}>
      <BarcodeScanScreen />
    </BookLookupContextProvider>,
  );
  return { lookupByIsbn, view };
}

async function scan(data: string, type = 'ean13') {
  await act(async () => mockCameraProps?.onBarcodeScanned?.({ type, data }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCameraProps = null;
  mockPermission = { granted: true, canAskAgain: true };
});

describe('BarcodeScanScreen', () => {
  it('権限が読み込み中ならカメラを出さない', async () => {
    mockPermission = null;
    await setup();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.queryByText('キャンセル')).toBeNull();
  });

  it('許可済みならカメラと説明・キャンセルを表示し、キャンセルで戻る', async () => {
    await setup();
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(mockCameraProps?.barcodeScannerSettings).toEqual({ barcodeTypes: ['ean13'] });
    expect(
      screen.getByText('本のバーコード（978 または 979 で始まる段）を枠に合わせてください'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('ISBN を検出すると検索し、見つかれば記録フォームへ replace する', async () => {
    let resolve: (r: BookLookupResult) => void = () => {};
    const { lookupByIsbn } = await setup([new Promise((r) => (resolve = r))]);
    await scan('1920000000000');
    await scan('9784065199818');
    await scan(ISBN, 'qr');
    expect(lookupByIsbn).not.toHaveBeenCalled();
    await scan(ISBN);
    expect(screen.getByText('書誌情報を検索中…')).toBeTruthy();
    expect(mockCameraProps?.onBarcodeScanned).toBeUndefined();
    await scan(ISBN);
    expect(lookupByIsbn).toHaveBeenCalledTimes(1);
    expect(lookupByIsbn).toHaveBeenCalledWith(ISBN);
    await act(async () => resolve({ status: 'found', book }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: {
        kind: 'book',
        title: 'T',
        isbn: ISBN,
        creator: 'A',
        publisher: 'P',
        coverUrl: 'U',
      },
    });
  });

  it('同期的に連続した検出でも検索は 1 回', async () => {
    const { lookupByIsbn } = await setup([new Promise(() => {})]);
    await act(async () => {
      mockCameraProps?.onBarcodeScanned?.({ type: 'ean13', data: ISBN });
      mockCameraProps?.onBarcodeScanned?.({ type: 'ean13', data: ISBN });
    });
    expect(lookupByIsbn).toHaveBeenCalledTimes(1);
  });

  it('見つからないとき、手入力で続ける・もう一度読み取るができる', async () => {
    const { lookupByIsbn } = await setup([
      Promise.resolve({ status: 'not_found' }),
      Promise.resolve({ status: 'not_found' }),
    ]);
    await scan(ISBN);
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.queryByRole('button', { name: '再試行' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '手入力で続ける' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'book', isbn: ISBN },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'もう一度読み取る' }));
    await scan(ISBN);
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    await fireEvent.press(await screen.findByRole('button', { name: 'キャンセル' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('通信エラー時は再試行できる', async () => {
    const { lookupByIsbn } = await setup([
      Promise.resolve({ status: 'error' }),
      Promise.resolve({ status: 'found', book }),
    ]);
    await scan(ISBN);
    expect(
      await screen.findByText('書誌情報を取得できませんでした。通信状況を確認してください'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '再試行' }));
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    expect(lookupByIsbn).toHaveBeenLastCalledWith(ISBN);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('アンマウント後の結果は無視する', async () => {
    let resolve: (r: BookLookupResult) => void = () => {};
    const { view } = await setup([new Promise((r) => (resolve = r))]);
    await scan(ISBN);
    await view.unmount();
    await act(async () => resolve({ status: 'found', book }));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('未許可（再要求可）なら理由と許可ボタンを表示し、押すと要求する', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    await setup();
    expect(screen.getByText('バーコードを読み取るためにカメラを使います')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'カメラを許可する' }));
    expect(mockRequestPermission).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN を手入力する' }));
    expect(router.replace).toHaveBeenCalledWith('/record/isbn');
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('拒否済みなら設定の案内を表示し、設定を開ける', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await setup();
    expect(screen.getByText('端末の設定でカメラを許可してください')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'カメラを許可する' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '設定を開く' }));
    expect(openSettings).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN を手入力する' }));
    expect(router.replace).toHaveBeenCalledWith('/record/isbn');
  });

  it.each([
    ['カメラ表示', { granted: true, canAskAgain: true }, 'camera'],
    ['権限要求', { granted: false, canAskAgain: true }, 'カメラを許可する'],
  ])('%s は上端インセット分の余白を確保する', async (_name, permission, target) => {
    mockPermission = permission;
    const metrics = {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 0 },
    };
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <BookLookupContextProvider provider={{ lookupByIsbn: jest.fn() }}>
          <BarcodeScanScreen />
        </BookLookupContextProvider>
      </SafeAreaProvider>,
    );
    let node = (screen.queryByTestId(target) ?? screen.getByText(target)).parent;
    let paddingTop: unknown;
    while (node && paddingTop !== 47) {
      paddingTop = StyleSheet.flatten(node.props.style)?.paddingTop;
      node = node.parent;
    }
    expect(paddingTop).toBe(47);
  });
});
