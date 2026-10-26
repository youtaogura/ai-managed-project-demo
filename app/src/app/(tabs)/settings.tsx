import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { SettingsScreen } from '../../screens/SettingsScreen';

export default function SettingsRoute() {
  // データ画面から戻ったとき、「最後に書き出した日」を読み直す
  const [reloadKey, setReloadKey] = useState(0);
  useFocusEffect(useCallback(() => setReloadKey((k) => k + 1), []));
  return (
    <SettingsScreen
      reloadKey={reloadKey}
      onOpenData={() => router.push('/data')}
      onOpenAbout={() => router.push('/about')}
    />
  );
}
