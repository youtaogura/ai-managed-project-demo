import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { RereadScreen } from '../../screens/RereadScreen';

export default function RereadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RereadScreen
        recordId={id}
        onEdit={(recordId) => router.push({ pathname: '/record/[id]', params: { id: recordId } })}
        onWrite={(recordId) => router.push({ pathname: '/write/[id]', params: { id: recordId, from: 'reread' } })}
        onBack={() => router.replace('/')}
      />
    </>
  );
}
