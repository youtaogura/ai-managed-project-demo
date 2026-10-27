import { Stack, useLocalSearchParams } from 'expo-router';

import { paramsToInitialValues } from '../../lib/recordForm';
import { RecordFormScreen } from '../../screens/RecordFormScreen';

export default function NewRecordRoute() {
  const params = useLocalSearchParams();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RecordFormScreen initialValues={paramsToInitialValues(params)} />
    </>
  );
}
