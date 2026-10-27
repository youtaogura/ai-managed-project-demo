import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { WriteScreen } from '../../screens/WriteScreen';

export default function WriteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WriteScreen
        recordId={id}
        onSaved={(recordId) => router.replace(`/records/${recordId}`)}
        onLater={() => router.replace('/')}
      />
    </>
  );
}
