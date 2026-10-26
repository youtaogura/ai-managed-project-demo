import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BookLookupContextProvider } from '../hooks/useBookLookup';
import { RecordRepositoryProvider } from '../hooks/useRecordRepository';

export default function RootLayout() {
  return (
    <RecordRepositoryProvider>
      <BookLookupContextProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="record/new" options={{ headerShown: true, title: '記録を追加' }} />
          <Stack.Screen name="record/isbn" options={{ headerShown: true, title: 'ISBN で探す' }} />
          <Stack.Screen name="record/[id]" options={{ headerShown: true, title: '記録を編集' }} />
        </Stack>
        <StatusBar style="auto" />
      </BookLookupContextProvider>
    </RecordRepositoryProvider>
  );
}
