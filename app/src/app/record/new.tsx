import { useLocalSearchParams } from 'expo-router';

import { paramsToInitialValues } from '../../lib/recordForm';
import { RecordFormScreen } from '../../screens/RecordFormScreen';

export default function NewRecordRoute() {
  const params = useLocalSearchParams();
  return <RecordFormScreen initialValues={paramsToInitialValues(params)} />;
}
