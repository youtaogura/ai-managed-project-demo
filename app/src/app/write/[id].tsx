import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { WriteScreen } from '../../screens/WriteScreen';

export default function WriteRoute() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const fromReread = typeof from === 'string' && from === 'reread';
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WriteScreen
        recordId={id}
        onSaved={(recordId) => router.replace(`/records/${recordId}`)}
        onLater={() => (fromReread && router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </>
  );
}
