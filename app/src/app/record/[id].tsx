import { Stack, useLocalSearchParams } from 'expo-router';

import { RecordFormScreen } from '../../screens/RecordFormScreen';

export default function EditRecordRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RecordFormScreen recordId={typeof id === 'string' ? id : ''} />
    </>
  );
}
