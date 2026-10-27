import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { goBackOrHome } from '../../lib/navigation';
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
        onSaved={(recordId) =>
          fromReread ? router.dismissTo(`/records/${recordId}`) : router.replace(`/records/${recordId}`)
        }
        onLater={() => (fromReread ? goBackOrHome(router) : router.dismissTo('/'))}
      />
    </>
  );
}
