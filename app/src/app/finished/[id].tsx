import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { FinishedScreen } from '../../screens/FinishedScreen';

export default function FinishedRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FinishedScreen
        recordId={id}
        onWrite={(recordId) => router.replace(`/write/${recordId}`)}
        onLater={() => router.replace('/')}
      />
    </>
  );
}
