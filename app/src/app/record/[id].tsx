import { Stack, useLocalSearchParams } from 'expo-router';

import { RecordFormScreen } from '../../screens/RecordFormScreen';

export default function EditRecordRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: '記録を編集' }} />
      <RecordFormScreen recordId={typeof id === 'string' ? id : ''} />
    </>
  );
}
