import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { formatDate } from '../lib/format';
import type { BackupFile, ImportMode } from '../types/backup';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type ImportSheetProps = {
  visible: boolean;
  fileName: string;
  backup: BackupFile | null;
  mode: ImportMode;
  includeSettings: boolean;
  busy?: boolean;
  onModeChange: (mode: ImportMode) => void;
  onIncludeSettingsChange: (include: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const MODES: readonly { id: ImportMode; label: string; note: string }[] = [
  { id: 'merge', label: '今の記録に追加する', note: '同じ記録はファイルの内容で上書き' },
  { id: 'replace', label: '今の記録と置き換える', note: '今ある記録は削除' },
];

type ChoiceProps = {
  label: string;
  note?: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

function Choice({ label, note, selected, disabled, onPress }: ChoiceProps) {
  const ink = selected ? colors.accentInk : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <AppText variant="body" style={[styles.name, { color: ink }]}>
        {label}
      </AppText>
      {note ? (
        <AppText variant="label" style={{ color: selected ? colors.accentInk : colors.textSecondary }}>
          {note}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function ImportSheet({
  visible,
  fileName,
  backup,
  mode,
  includeSettings,
  busy = false,
  onModeChange,
  onIncludeSettingsChange,
  onCancel,
  onConfirm,
}: ImportSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="記録を読み込む">
      <AppText variant="body" style={styles.name}>
        {fileName}
      </AppText>
      <AppText variant="label" style={styles.summary}>
        {`${backup?.records.length ?? 0} 件の記録`}
      </AppText>
      <AppText variant="label" style={styles.summary}>
        {backup ? `書き出した日 ${formatDate(backup.exportedAt)}` : ''}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="読み込み方" style={styles.group}>
        {MODES.map((m) => (
          <Choice
            key={m.id}
            label={m.label}
            note={m.note}
            selected={mode === m.id}
            disabled={busy}
            onPress={() => onModeChange(m.id)}
          />
        ))}
      </View>
      {backup?.settings ? (
        <View accessibilityRole="radiogroup" accessibilityLabel="設定" style={styles.group}>
          <Choice
            label="設定も読み込む"
            selected={includeSettings}
            disabled={busy}
            onPress={() => onIncludeSettingsChange(true)}
          />
          <Choice
            label="設定は読み込まない"
            selected={!includeSettings}
            disabled={busy}
            onPress={() => onIncludeSettingsChange(false)}
          />
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button variant="outline" label="キャンセル" onPress={onCancel} disabled={busy} />
        <Button label="読み込む" onPress={onConfirm} disabled={busy} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  summary: { color: colors.textSecondary },
  group: { gap: space[2], marginTop: space[3] },
  option: {
    minHeight: size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.card,
    backgroundColor: colors.surface2,
  },
  optionSelected: { backgroundColor: colors.accent },
  name: { fontWeight: '700' },
  actions: { gap: space[3], marginTop: space[4] },
});
