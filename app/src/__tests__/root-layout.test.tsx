import { render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import RootLayout from '../app/_layout';
import { useAppFonts } from '../hooks/useAppFonts';

jest.mock('../hooks/useAppFonts', () => ({ useAppFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));
jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  function Passthrough({ children }: { children?: unknown }) {
    return <View>{children as never}</View>;
  }
  const Stack = Object.assign(Passthrough, { Screen: () => null });
  return {
    Stack,
    ThemeProvider: Passthrough,
    DefaultTheme: jest.requireActual('expo-router').DefaultTheme,
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockUseAppFonts = jest.mocked(useAppFonts);

describe('ルートレイアウト', () => {
  beforeEach(() => jest.clearAllMocks());

  it('フォント読み込み中は何も描画せず、スプラッシュを隠さない', async () => {
    mockUseAppFonts.mockReturnValue({ ready: false });
    await render(<RootLayout />);
    expect(StatusBar).not.toHaveBeenCalled();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('読み込み完了後は描画し、スプラッシュを隠し、ステータスバーは dark（明るい地に暗い文字）', async () => {
    mockUseAppFonts.mockReturnValue({ ready: true });
    await render(<RootLayout />);
    expect(jest.mocked(StatusBar).mock.calls[0]?.[0]).toMatchObject({ style: 'dark' });
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});
