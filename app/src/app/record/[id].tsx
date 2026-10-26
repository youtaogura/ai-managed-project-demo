import { useLocalSearchParams } from 'expo-router';

import { RecordFormScreen } from '../../screens/RecordFormScreen';

export default function EditRecordRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecordFormScreen recordId={typeof id === 'string' ? id : ''} />;
}
