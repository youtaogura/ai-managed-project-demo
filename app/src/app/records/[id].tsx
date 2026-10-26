import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { RecordDetailScreen } from '../../screens/RecordDetailScreen';

export default function RecordDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goToList = () => router.replace('/');
  return (
    <>
      <Stack.Screen options={{ title: '記録の詳細' }} />
      <RecordDetailScreen
        recordId={id}
        onEdit={(recordId) => router.push({ pathname: '/record/[id]', params: { id: recordId } })}
        onDeleted={goToList}
        onBack={goToList}
      />
    </>
  );
}
