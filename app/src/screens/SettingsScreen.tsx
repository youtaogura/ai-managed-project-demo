import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { StatusDefaultSheet } from '../components/StatusDefaultSheet';
import { ScreenContainer } from '../components/ScreenContainer';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsRow } from '../components/SettingsRow';
import { space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSettings } from '../hooks/useSettings';
import { useStarterSettings } from '../hooks/useStarterSettings';
import { starterSummary } from '../lib/starterItems';
import { formatVersion, getAppInfo } from '../lib/appInfo';
import { useLastExportedAt } from '../hooks/useLastExportedAt';
import { createExportStore, type ExportStore } from '../lib/exportStore';
import { formatDate } from '../lib/format';
import { asyncKeyValueStorage } from '../lib/storage';
import { STATUS_DEFAULT_LABELS } from '../lib/statusDefault';


const defaultExportStore = createExportStore(asyncKeyValueStorage);

type SettingsScreenProps = {
  exportStore?: ExportStore;
  /** 値が変わると「最後に書き出した日」を読み直す。 */
  reloadKey?: number;
  onOpenData?: () => void;
  onOpenAbout?: () => void;
  onOpenStarters?: () => void;
};

export function SettingsScreen({
  exportStore = defaultExportStore,
  reloadKey,
  onOpenData = () => undefined,
  onOpenAbout = () => undefined,
  onOpenStarters = () => undefined,
}: SettingsScreenProps) {
  const { lastExportedAt } = useLastExportedAt(exportStore, reloadKey);
  const { settings, update } = useSettings();
  const { starterSettings } = useStarterSettings();
  const bottomInset = useBottomInset();
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}
      >
        <AppText variant="screenTitle" style={styles.title}>
          設定
        </AppText>
        <SettingsCard title="記録するとき">
          <SettingsRow
            label="ステータスの初期値"
            value={STATUS_DEFAULT_LABELS[settings.defaultStatus]}
            onPress={() => setStatusOpen(true)}
          />
          <View style={styles.gap} />
          <SettingsRow label="書き出し" value={starterSummary(starterSettings)} onPress={onOpenStarters} />
        </SettingsCard>
        <SettingsCard title="データ">
          <SettingsRow
            label="データ"
            value={`書き出し・読み込み · ${
              lastExportedAt ? `最後に書き出した日 ${formatDate(lastExportedAt)}` : 'まだ書き出していません'
            }`}
            onPress={onOpenData}
          />
        </SettingsCard>
        <SettingsCard title="このアプリ">
          <SettingsRow
            label="このアプリについて"
            value={formatVersion(getAppInfo().version, null)}
            onPress={onOpenAbout}
          />
        </SettingsCard>
      </ScrollView>
      <StatusDefaultSheet
        visible={statusOpen}
        value={settings.defaultStatus}
        onClose={() => setStatusOpen(false)}
        onChange={(defaultStatus) => {
          update({ defaultStatus });
          setStatusOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], gap: space[5] },
  title: { paddingVertical: space[3] },
  gap: { height: space[2] },
});
