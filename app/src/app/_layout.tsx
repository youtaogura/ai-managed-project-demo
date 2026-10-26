import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { RecordRepositoryProvider } from '../hooks/useRecordRepository';

export default function RootLayout() {
  return (
    <RecordRepositoryProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="record/new" options={{ headerShown: true, title: '記録を追加' }} />
        <Stack.Screen name="record/[id]" options={{ headerShown: true, title: '記録を編集' }} />
      </Stack>
      <StatusBar style="auto" />
    </RecordRepositoryProvider>
  );
}
