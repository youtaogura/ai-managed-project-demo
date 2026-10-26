import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '../components/AppText';
import { ChipMultiGroup, type ChipOption } from '../components/Chip';
import { HeroCriterionSheet } from '../components/HeroCriterionSheet';
import { ScreenContainer } from '../components/ScreenContainer';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsRow } from '../components/SettingsRow';
import { colors, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSettings } from '../hooks/useSettings';
import { useLastExportedAt } from '../hooks/useLastExportedAt';
import { createExportStore, type ExportStore } from '../lib/exportStore';
import { formatDate } from '../lib/format';
import { asyncKeyValueStorage } from '../lib/storage';
import { toggleKind } from '../lib/enabledKinds';
import { HERO_CRITERIA } from '../lib/heroCriteria';
import { KIND_LABELS } from '../lib/statusLabel';
import { MEDIA_KINDS, type MediaKind } from '../types/record';

const KIND_OPTIONS: readonly ChipOption<MediaKind>[] = MEDIA_KINDS.map((value) => ({
  value,
  label: KIND_LABELS[value],
}));
const KIND_COLUMNS = 3;

const defaultExportStore = createExportStore(asyncKeyValueStorage);

type SettingsScreenProps = {
  exportStore?: ExportStore;
  /** 値が変わると「最後に書き出した日」を読み直す。 */
  reloadKey?: number;
  onOpenData?: () => void;
};

export function SettingsScreen({
  exportStore = defaultExportStore,
  reloadKey,
  onOpenData = () => undefined,
}: SettingsScreenProps) {
  const { lastExportedAt } = useLastExportedAt(exportStore, reloadKey);
  const { settings, update } = useSettings();
  const bottomInset = useBottomInset();
  const [heroOpen, setHeroOpen] = useState(false);

  const onToggle = (kind: MediaKind) => {
    const next = toggleKind(settings.enabledKinds, kind);
    // 最後の 1 つは外せない（状態も保存も変えない）
    if (
      next.length === settings.enabledKinds.length &&
      next.every((k, i) => k === settings.enabledKinds[i])
    ) {
      return;
    }
    update({ enabledKinds: next });
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}
      >
        <AppText variant="screenTitle" style={styles.title}>
          設定
        </AppText>
        <SettingsCard title="使う種別">
          <ChipMultiGroup
            label="使う種別"
            options={KIND_OPTIONS}
            values={settings.enabledKinds}
            onChange={onToggle}
            columns={KIND_COLUMNS}
          />
          <AppText variant="micro" style={styles.note}>
            使わない種別は、入力欄・一覧・振り返りに出なくなります。記録は消えず、戻せば元どおり表示されます。
          </AppText>
          <AppText variant="micro" style={styles.note}>
            最低 1 つは選んでおく必要があります
          </AppText>
        </SettingsCard>
        <SettingsCard title="記録一覧">
          <SettingsRow
            label="上に大きく出す作品"
            value={HERO_CRITERIA[settings.heroCriterion].label}
            onPress={() => setHeroOpen(true)}
          />
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
      </ScrollView>
      <HeroCriterionSheet
        visible={heroOpen}
        value={settings.heroCriterion}
        onClose={() => setHeroOpen(false)}
        onChange={(heroCriterion) => {
          update({ heroCriterion });
          setHeroOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], gap: space[5] },
  title: { paddingVertical: space[3] },
  note: { color: colors.textTertiary, marginTop: space[1] },
});
