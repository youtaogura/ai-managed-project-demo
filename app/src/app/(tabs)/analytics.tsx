import { useRouter } from 'expo-router';

import { recordHref } from '../../lib/recordRoute';
import { ReviewScreen } from '../../screens/ReviewScreen';

// ルート名は analytics のまま（表示名は「振り返り」）。見出しは画面側が持つ
export default function AnalyticsRoute() {
  const router = useRouter();
  return (
    <ReviewScreen
      onAdd={() => router.push('/record/new')}
      onOpenRecord={(record) => router.push(recordHref(record))}
    />
  );
}
