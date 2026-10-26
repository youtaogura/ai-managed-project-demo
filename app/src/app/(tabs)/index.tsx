import { useRouter } from 'expo-router';

import { RecordsScreen } from '../../screens/RecordsScreen';

export default function RecordsRoute() {
  const router = useRouter();
  return (
    <RecordsScreen
      onAdd={() => router.push('/records/new')}
      onOpen={(id) => router.push(`/records/${id}`)}
    />
  );
}
