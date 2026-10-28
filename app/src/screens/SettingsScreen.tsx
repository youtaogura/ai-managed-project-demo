import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '../components/AppText';
import { SortSheet } from '../components/SortSheet';
import { StatusDefaultSheet } from '../components/StatusDefaultSheet';
import { ScreenContainer } from '../components/ScreenContainer';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsRow } from '../components/SettingsRow';
import { space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSortOrder } from '../hooks/useSortOrder';
import { useShelfRepository } from '../hooks/useShelfRepository';
import { useSettings } from '../hooks/useSettings';
import { useLastExportedAt } from '../hooks/useLastExportedAt';
import { createExportStore, type ExportStore } from '../lib/exportStore';
import { formatDate } from '../lib/format';
import { asyncKeyValueStorage } from '../lib/storage';
import { SORT_ORDER_LABELS } from '../lib/sortOrderLabel';
import { createSortOrderStore, type SortOrderStore } from '../lib/sortOrderStore';
import { STATUS_DEFAULT_LABELS } from '../lib/statusDefault';


const defaultExportStore = createExportStore(asyncKeyValueStorage);
const defaultSortOrderStore = createSortOrderStore(asyncKeyValueStorage);

type SettingsScreenProps = {
  exportStore?: ExportStore;
  sortOrderStore?: SortOrderStore;
  /** 値が変わると「最後に書き出した日」と本棚の数を読み直す。 */
  reloadKey?: number;
  onOpenData?: () => void;
  onOpenAbout?: () => void;
  onOpenShelves?: () => void;
};

export function SettingsScreen({
  exportStore = defaultExportStore,
  sortOrderStore = defaultSortOrderStore,
  reloadKey,
  onOpenData = () => undefined,
  onOpenAbout = () => undefined,
  onOpenShelves = () => undefined,
}: SettingsScreenProps) {
  const { lastExportedAt } = useLastExportedAt(exportStore, reloadKey);
  const { settings, update } = useSettings();
  const shelfRepository = useShelfRepository();
  const [shelfCount, setShelfCount] = useState(0);
  useEffect(() => {
    let active = true;
    shelfRepository
      .getAll()
      .then((all) => all.length)
      .catch(() => 0)
      .then((n) => {
        if (active) setShelfCount(n);
      });
    return () => {
      active = false;
    };
  }, [shelfRepository, reloadKey]);
  const [sortOrder, setSortOrder] = useSortOrder(sortOrderStore, reloadKey);
  const [sortOpen, setSortOpen] = useState(false);
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
        <SettingsCard title="読み終えたら">
          <SettingsRow
            label="ステータスの初期値"
            value={STATUS_DEFAULT_LABELS[settings.defaultStatus]}
            onPress={() => setStatusOpen(true)}
          />
        </SettingsCard>
        <SettingsCard title="本棚">
          <SettingsRow
            label="本棚の管理"
            value={shelfCount === 0 ? 'まだありません' : `${shelfCount} つ`}
            onPress={onOpenShelves}
          />
          <SettingsRow
            label="並び順"
            value={SORT_ORDER_LABELS[sortOrder]}
            onPress={() => setSortOpen(true)}
          />
        </SettingsCard>
        <SettingsCard>
          <SettingsRow
            label="データ"
            value={`書き出し・読み込み · ${
              lastExportedAt ? `最後に書き出した日 ${formatDate(lastExportedAt)}` : 'まだ書き出していません'
            }`}
            onPress={onOpenData}
          />
          <SettingsRow label="このアプリについて" onPress={onOpenAbout} />
        </SettingsCard>
      </ScrollView>
      <SortSheet
        visible={sortOpen}
        value={sortOrder}
        onClose={() => setSortOpen(false)}
        onChange={setSortOrder}
      />
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
});
