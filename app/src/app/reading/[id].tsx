import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ReadingScreen } from '../../screens/ReadingScreen';

export default function ReadingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ReadingScreen
        recordId={id}
        onEdit={(recordId) => router.push({ pathname: '/record/[id]', params: { id: recordId } })}
        onFinished={(recordId) => router.replace(`/finished/${recordId}`)}
        onBack={() => router.replace('/')}
      />
    </>
  );
}
