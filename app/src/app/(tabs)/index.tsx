import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { RecordsScreen } from '../../screens/RecordsScreen';
import type { MediaRecord } from '../../types/record';

export default function RecordsRoute() {
  const router = useRouter();
  // 設定で並び順を変えたあと戻ったとき、保存された並び順を読み直す
  const [reloadKey, setReloadKey] = useState(0);
  useFocusEffect(useCallback(() => setReloadKey((k) => k + 1), []));

  // 背表紙のタップ先。読んでる本は「読んでる本」、それ以外は今の詳細画面（読み返す画面は #89 以降で差し替える）
  const openRecord = (record: MediaRecord) =>
    router.push(record.status === 'in_progress' ? `/reading/${record.id}` : `/records/${record.id}`);

  return (
    <RecordsScreen
      reloadKey={reloadKey}
      onAdd={() => router.push('/record/new')}
      onOpen={openRecord}
    />
  );
}
