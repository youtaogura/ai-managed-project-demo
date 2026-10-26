import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BookLookupContextProvider } from '../hooks/useBookLookup';
import { PhotoServiceContextProvider } from '../hooks/usePhotoService';
import { RecordRepositoryProvider } from '../hooks/useRecordRepository';

// ヘッダーの有無とタイトルは各ルートの Stack.Screen で指定する。
// 名前文字列で個別指定すると、ルート名と食い違ったときに黙って無効になるため。
export default function RootLayout() {
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
