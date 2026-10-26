import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BookLookupContextProvider } from '../hooks/useBookLookup';
import { PhotoServiceContextProvider } from '../hooks/usePhotoService';
import { RecordRepositoryProvider } from '../hooks/useRecordRepository';
import { parsePreviewInsets } from '../lib/previewInsets';

// ヘッダーの有無とタイトルは各ルートの Stack.Screen で指定する。
// 名前文字列で個別指定すると、ルート名と食い違ったときに黙って無効になるため。
function Providers() {
  return (
    <RecordRepositoryProvider>
      <BookLookupContextProvider>
        <PhotoServiceContextProvider>
          <Stack screenOptions={{ headerShown: true }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </PhotoServiceContextProvider>
      </BookLookupContextProvider>
    </RecordRepositoryProvider>
  );
}

// UI プレビュー（Web）用に、ビルド時の環境変数でセーフエリアを再現する。未設定なら何もしない
export default function RootLayout() {
  const insets = parsePreviewInsets(process.env.EXPO_PUBLIC_PREVIEW_INSETS);
  if (!insets) return <Providers />;
  const { width, height } = Dimensions.get('window');
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets }}>
      <Providers />
    </SafeAreaProvider>
  );
}
