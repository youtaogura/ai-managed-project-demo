import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { ChipMultiGroup, type ChipOption } from '../components/Chip';
import { HeroCriterionSheet } from '../components/HeroCriterionSheet';
import { ScreenContainer } from '../components/ScreenContainer';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsRow } from '../components/SettingsRow';
import { Toggle } from '../components/Toggle';
import { colors, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSettings } from '../hooks/useSettings';
import { toggleKind } from '../lib/enabledKinds';
import { HERO_CRITERIA } from '../lib/heroCriteria';
import { RECORD_FIELD_LABELS, RECORD_FIELDS, withFieldToggled } from '../lib/recordFields';
import { KIND_LABELS } from '../lib/statusLabel';
import { MEDIA_KINDS, type MediaKind } from '../types/record';
import type { RecordFieldKey } from '../types/settings';

const KIND_OPTIONS: readonly ChipOption<MediaKind>[] = MEDIA_KINDS.map((value) => ({
  value,
  label: KIND_LABELS[value],
}));
const KIND_COLUMNS = 3;

const FIELD_DESCRIPTIONS: Partial<Record<RecordFieldKey, string>> = {
  startDate: '本・漫画は「読み始めた日」、映画・ドラマ・アニメは「見始めた日」と表示されます',
  endDate: '本・漫画は「読み終えた日」、映画・ドラマ・アニメは「見終えた日」と表示されます',
  photo: '書影の自動取得はオフになりません',
};

export function SettingsScreen() {
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

  const onToggleField = (key: RecordFieldKey, value: boolean) => {
    update({ enabledFields: withFieldToggled(settings.enabledFields, key, value) });
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
        <View style={styles.section}>
          <SettingsCard title="記録する項目">
            {RECORD_FIELDS.map((key, index) => (
              <View key={key} style={index > 0 ? styles.divider : undefined}>
                <Toggle
                  label={RECORD_FIELD_LABELS[key]}
                  description={FIELD_DESCRIPTIONS[key]}
                  value={settings.enabledFields[key]}
                  onChange={(value) => onToggleField(key, value)}
                />
              </View>
            ))}
          </SettingsCard>
          <AppText variant="micro" style={styles.footnote}>
            オフにした項目は、入力欄にも表示にも出なくなります。入力済みの内容は消えません。
          </AppText>
        </View>
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
  section: { gap: space[2] },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  footnote: { color: colors.textTertiary },
  note: { color: colors.textTertiary, marginTop: space[1] },
});
