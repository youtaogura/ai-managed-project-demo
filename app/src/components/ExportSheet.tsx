import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

export type ExportFormat = 'json' | 'csv';

type ExportSheetProps = {
  visible: boolean;
  count: number;
  busy?: boolean;
  onClose: () => void;
  onSelect: (format: ExportFormat) => void;
};

export function ExportSheet({ visible, count, busy = false, onClose, onSelect }: ExportSheetProps) {
  const csvDisabled = busy || count === 0;
  return (
    <BottomSheet visible={visible} onClose={onClose} title="記録を書き出す" showCloseButton>
      <AppText variant="body" style={styles.count}>{`${count} 件の記録`}</AppText>
      <AppText variant="micro" style={styles.note}>
        ファイルを作って、共有メニューから保存先を選びます。
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="バックアップ（JSON）"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => onSelect('json')}
        style={[styles.option, styles.primary, busy && styles.disabled]}
      >
        <AppText variant="body" style={[styles.name, { color: colors.accentInk }]}>
          バックアップ（JSON）
        </AppText>
        <AppText variant="label" style={{ color: colors.accentInk }}>
          記録と設定をすべて含む。このアプリで読み込める
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="表形式（CSV）"
        accessibilityState={{ disabled: csvDisabled }}
        disabled={csvDisabled}
        onPress={() => onSelect('csv')}
        style={[styles.option, styles.outline, csvDisabled && styles.disabled]}
      >
        <AppText variant="body" style={styles.name}>
          表形式（CSV）
        </AppText>
        <AppText variant="label" style={{ color: colors.textSecondary }}>
          {count === 0 ? '記録がありません' : '表計算ソフトで見る用。読み込みには使えない'}
        </AppText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  count: { fontWeight: '700' },
  note: { color: colors.textTertiary, marginBottom: space[3] },
  option: {
    minHeight: size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.card,
    marginBottom: space[2],
  },
  primary: { backgroundColor: colors.accent },
  outline: { borderWidth: 1, borderColor: colors.lineStrong },
  name: { fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
