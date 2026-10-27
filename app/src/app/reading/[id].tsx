import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useBookFlight } from '../../hooks/useBookFlight';
import { goBackOrHome } from '../../lib/navigation';
import { ReadingScreen } from '../../screens/ReadingScreen';

// 戻る動き（「‹」・端スワイプ・戻るボタン）のときだけ、背表紙を棚へ戻す。replace などでは動かさない
const BACK_ACTIONS: readonly string[] = ['GO_BACK', 'POP', 'POP_TO'];

type BeforeRemoveEvent = { data?: { action?: { type?: string } } };
type BeforeRemoveSource = {
  addListener: (type: 'beforeRemove', listener: (e: BeforeRemoveEvent) => void) => () => void;
};

export default function ReadingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation() as unknown as BeforeRemoveSource;
  const { close } = useBookFlight();
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!BACK_ACTIONS.includes(e.data?.action?.type ?? '')) return;
        close(id);
      }),
    [navigation, close, id],
  );
  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <ReadingScreen
        recordId={id}
        onEdit={(recordId) => router.push({ pathname: '/record/[id]', params: { id: recordId } })}
        onFinished={(recordId) => router.replace(`/finished/${recordId}`)}
        onBack={() => goBackOrHome(router)}
      />
    </>
  );
}
