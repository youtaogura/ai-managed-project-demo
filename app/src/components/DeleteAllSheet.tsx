import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type DeleteAllSheetProps = {
  visible: boolean;
  /** 削除される記録の全件数 */
  count: number;
  busy?: boolean;
  onExport: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteAllSheet({
  visible,
  count,
  busy = false,
  onExport,
  onCancel,
  onConfirm,
}: DeleteAllSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="すべての記録を削除しますか？">
      <AppText style={[styles.message, { color: colors.textSecondary }]}>
        {`${count} 件の記録（メモ・引用・書き出しを含む）がすべて削除されます。元に戻せません。設定はそのまま残ります。`}
      </AppText>
      <View style={styles.actions}>
        <Button label="先に書き出す" onPress={onExport} disabled={busy} />
        <Button variant="outline" label="キャンセル" onPress={onCancel} disabled={busy} />
        <Button
          variant="outline"
          tone="danger"
          label="すべて削除する"
          onPress={onConfirm}
          disabled={busy}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: { marginBottom: space[4] },
  actions: { gap: space[3] },
});
