import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type DeleteConfirmSheetProps = {
  visible: boolean;
  /** 削除する記録のタイトル */
  title: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirmSheet({
  visible,
  title,
  busy = false,
  onConfirm,
  onCancel,
}: DeleteConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="この記録を削除しますか？">
      <AppText style={[styles.message, { color: colors.textSecondary }]}>
        {`「${title}」の記録（メモ・引用・読後メモを含む）が削除されます。元に戻せません。`}
      </AppText>
      <View style={styles.actions}>
        <Button variant="outline" label="キャンセル" onPress={onCancel} disabled={busy} />
        <Button variant="outline" tone="danger" label="削除する" onPress={onConfirm} disabled={busy} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: { marginBottom: space[4] },
  actions: { gap: space[3] },
});
