import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { AccessibilityInfo, Linking, Platform, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { BookLookupContextProvider } from '../../hooks/useBookLookup';
import type { BookLookupProvider } from '../../lib/bookLookup/BookLookupProvider';
import type { BookLookupResult } from '../../types/book';
import { BarcodeScanScreen } from '../BarcodeScanScreen';

type ScanHandler = (scan: { type: string; data: string }) => void;
type CameraProps = {
  onBarcodeScanned?: ScanHandler;
  barcodeScannerSettings?: unknown;
  enableTorch?: boolean;
  onCameraReady?: () => void;
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
  jest.restoreAllMocks();
  mockCameraProps = null;
  mockPermission = { granted: true, canAskAgain: true };
});

const withTopInset = (top: number, ui: ReactElement) => (
  <SafeAreaInsetsContext.Provider value={{ top, left: 0, right: 0, bottom: 34 }}>
    {ui}
  </SafeAreaInsetsContext.Provider>
);

type StyledNode = { props: { style?: unknown }; parent: StyledNode | null };

function paddingOf(node: StyledNode | null, key: 'paddingTop' | 'paddingBottom') {
  let current = node;
  while (current) {
    const value = (StyleSheet.flatten(current.props.style as never) as Record<string, number> | null)?.[key];
    if (value !== undefined) return value;
    current = current.parent;
  }
  return undefined;
}

describe('BarcodeScanScreen', () => {
  it('権限が読み込み中なら進行表示のみでカメラも操作も出さない', async () => {
    mockPermission = null;
    await setup();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('許可済みならカメラ・説明・読み取り線を表示し、閉じるで戻る', async () => {
    await setup();
    expect(screen.getByTestId('camera')).toBeTruthy();
    expect(mockCameraProps?.barcodeScannerSettings).toEqual({ barcodeTypes: ['ean13'] });
    expect(mockCameraProps?.enableTorch).toBe(false);
    expect(screen.getByText('バーコードを読み取る')).toBeTruthy();
    expect(screen.getByText('978 で始まるバーコードを枠に合わせてください')).toBeTruthy();
    expect(screen.getByText('読み取れたら自動で書誌情報を探します')).toBeTruthy();
    expect(screen.getByTestId('scan-line')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    expect(router.back).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN を手入力する' }));
    expect(router.replace).toHaveBeenCalledWith('/record/isbn');
  });

  it('「動きを減らす」が有効なら読み取り線は中央に静止する', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await setup();
    const line = await screen.findByTestId('scan-line');
    expect(StyleSheet.flatten(line.props.style).transform).toEqual([{ translateY: 0 }]);
  });

  it('ライトはカメラの準備完了後に出て、トグルで enableTorch が切り替わる', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: 'ライト' })).toBeNull();
    await act(async () => mockCameraProps?.onCameraReady?.());
    const torch = screen.getByRole('button', { name: 'ライト' });
    expect(torch.props.accessibilityState).toEqual({ selected: false });
    await fireEvent.press(torch);
    expect(mockCameraProps?.enableTorch).toBe(true);
    expect(screen.getByRole('button', { name: 'ライト' }).props.accessibilityState).toEqual({
      selected: true,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'ライト' }));
    expect(mockCameraProps?.enableTorch).toBe(false);
  });

  it('上部バーに上端インセット、下のボタンに下端インセットの余白が入る', async () => {
    await render(
      withTopInset(
        47,
        <BookLookupContextProvider provider={{ lookupByIsbn: jest.fn() }}>
          <BarcodeScanScreen />
        </BookLookupContextProvider>,
      ),
    );
    expect(paddingOf(screen.getByRole('button', { name: '閉じる' }), 'paddingTop')).toBe(47 + 8);
    expect(paddingOf(screen.getByRole('button', { name: 'ISBN を手入力する' }), 'paddingBottom')).toBe(
      16 + 34,
    );
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

  it('見つからないときは ISBN 画面の「見つかりませんでした」へ replace する', async () => {
    await setup([Promise.resolve({ status: 'not_found' })]);
    await scan(ISBN);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/isbn',
      params: { isbn: ISBN, notFound: '1' },
    });
  });

  it('通信エラー時はスキャン画面に留まり、再試行・手入力・もう一度読み取るができる', async () => {
    const { lookupByIsbn } = await setup([
      Promise.resolve({ status: 'error' }),
      Promise.resolve({ status: 'error' }),
      Promise.resolve({ status: 'found', book }),
    ]);
    await scan(ISBN);
    expect(
      await screen.findByText('書誌情報を取得できませんでした。通信状況を確認してください'),
    ).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN を手入力する' }));
    expect(router.replace).toHaveBeenLastCalledWith({
      pathname: '/record/isbn',
      params: { isbn: ISBN },
    });
    await fireEvent.press(screen.getByRole('button', { name: '再試行' }));
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    expect(lookupByIsbn).toHaveBeenLastCalledWith(ISBN);
    await fireEvent.press(await screen.findByRole('button', { name: 'もう一度読み取る' }));
    expect(screen.getByTestId('camera')).toBeTruthy();
    await scan(ISBN);
    expect(lookupByIsbn).toHaveBeenCalledTimes(3);
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
    expect(screen.queryByRole('button', { name: '設定を開く' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'カメラを許可する' }));
    expect(mockRequestPermission).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN を手入力する' }));
    expect(router.replace).toHaveBeenCalledWith('/record/isbn');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
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
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
  });
});

describe('BarcodeScanScreen（Web）', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Platform.OS = 'web';
  });
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('スマートフォン限定の案内と ISBN 手入力への導線を出し、カメラは描画しない', async () => {
    await setup();
    expect(screen.getByText('この機能はスマートフォンでのみ使えます')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.queryByRole('button', { name: 'カメラを許可する' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN を手入力する' }));
    expect(router.replace).toHaveBeenCalledWith('/record/isbn');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    expect(router.back).toHaveBeenCalled();
  });
});
