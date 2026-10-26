import { useLocalSearchParams, useRouter } from 'expo-router';

import { RecordDetailScreen } from '../../screens/RecordDetailScreen';

export default function RecordDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goToList = () => router.replace('/');
  return (
    <RecordDetailScreen
      recordId={id}
      onEdit={(recordId) => router.push(`/records/${recordId}/edit`)}
      onDeleted={goToList}
      onBack={goToList}
    />
  );
}
