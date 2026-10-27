import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { recordHref } from '../../lib/recordRoute';
import { RecordsScreen } from '../../screens/RecordsScreen';
import type { MediaRecord } from '../../types/record';

export default function RecordsRoute() {
  const router = useRouter();
  // 設定で並び順を変えたあと戻ったとき、保存された並び順を読み直す
  const [reloadKey, setReloadKey] = useState(0);
  useFocusEffect(useCallback(() => setReloadKey((k) => k + 1), []));

  // 背表紙のタップ先。読んでる本は「読んでる本」、それ以外は「読み返す」
  const openRecord = (record: MediaRecord) => router.push(recordHref(record));

  return (
    <RecordsScreen
      reloadKey={reloadKey}
      onAdd={() => router.push('/record/new')}
      onOpen={openRecord}
    />
  );
}
