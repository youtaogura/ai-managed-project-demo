import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="records/[id]" options={{ headerShown: true, title: '記録の詳細' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
