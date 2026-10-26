import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { navigationTheme, stackScreenOptions } from '../design/navigationTheme';
import { BookLookupContextProvider } from '../hooks/useBookLookup';
import { CoverResolverContextProvider } from '../hooks/useCoverResolver';
import { BookSearchContextProvider } from '../hooks/useBookSearch';
import { MediaSearchContextProvider } from '../hooks/useMediaSearch';
import { PhotoServiceContextProvider } from '../hooks/usePhotoService';
import { SettingsContextProvider } from '../hooks/useSettings';
import { RecordRepositoryProvider } from '../hooks/useRecordRepository';
import { useAppFonts } from '../hooks/useAppFonts';
import { parsePreviewInsets } from '../lib/previewInsets';

// フォント読み込みが終わるまでスプラッシュを表示し続ける。失敗しても握りつぶして起動する
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// ヘッダーの有無とタイトルは各ルートの Stack.Screen で指定する。
// 名前文字列で個別指定すると、ルート名と食い違ったときに黙って無効になるため。
function Providers() {
  return (
    <SettingsContextProvider>
      <RecordRepositoryProvider>
        <BookLookupContextProvider>
          <CoverResolverContextProvider>
            <BookSearchContextProvider>
              <MediaSearchContextProvider>
                <PhotoServiceContextProvider>
                  <ThemeProvider value={navigationTheme}>
                    <Stack screenOptions={stackScreenOptions}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    </Stack>
                  </ThemeProvider>
                  <StatusBar style="light" />
                </PhotoServiceContextProvider>
              </MediaSearchContextProvider>
            </BookSearchContextProvider>
          </CoverResolverContextProvider>
        </BookLookupContextProvider>
      </RecordRepositoryProvider>
    </SettingsContextProvider>
  );
}

// UI プレビュー（Web）用に、ビルド時の環境変数でセーフエリアを再現する。未設定なら何もしない
export default function RootLayout() {
  const { ready } = useAppFonts();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;
  const insets = parsePreviewInsets(process.env.EXPO_PUBLIC_PREVIEW_INSETS);
  if (!insets) return <Providers />;
  const { width, height } = Dimensions.get('window');
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
      <Providers />
    </SafeAreaProvider>
  );
}
