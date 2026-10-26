import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BookLookupContextProvider } from '../hooks/useBookLookup';
import { BookSearchContextProvider } from '../hooks/useBookSearch';
import { RecordRepositoryProvider } from '../hooks/useRecordRepository';

export default function RootLayout() {
  return (
    <RecordRepositoryProvider>
      <BookLookupContextProvider>
        <BookSearchContextProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="records/[id]" options={{ headerShown: true, title: '記録の詳細' }} />
          <Stack.Screen name="record/new" options={{ headerShown: true, title: '記録を追加' }} />
          <Stack.Screen name="record/isbn" options={{ headerShown: true, title: 'ISBN で探す' }} />
          <Stack.Screen
            name="record/search"
            options={{ headerShown: true, title: 'タイトルで探す' }}
          />
          <Stack.Screen
            name="record/scan"
            options={{ headerShown: true, title: 'バーコード読み取り' }}
          />
          <Stack.Screen name="record/[id]" options={{ headerShown: true, title: '記録を編集' }} />
        </Stack>
        <StatusBar style="auto" />
        </BookSearchContextProvider>
      </BookLookupContextProvider>
    </RecordRepositoryProvider>
  );
}
