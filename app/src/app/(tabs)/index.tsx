import { useRouter } from 'expo-router';

import { RecordsScreen } from '../../screens/RecordsScreen';
import type { MediaRecord } from '../../types/record';

export default function RecordsRoute() {
  const router = useRouter();

  // 背表紙のタップ先。読んでる本は「読んでる本」、それ以外は今の詳細画面（読み返す画面は #89 以降で差し替える）
  const openRecord = (record: MediaRecord) =>
    router.push(record.status === 'in_progress' ? `/reading/${record.id}` : `/records/${record.id}`);

  return <RecordsScreen onAdd={() => router.push('/record/new')} onOpen={openRecord} />;
}
