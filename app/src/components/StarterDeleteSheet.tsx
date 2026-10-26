import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type StarterDeleteSheetProps = {
  visible: boolean;
  /** 削除する書き出しの文 */
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function StarterDeleteSheet({ visible, text, onConfirm, onCancel }: StarterDeleteSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="この書き出しを削除しますか？">
      <AppText variant="starter" style={styles.quote}>
        {`「${text}」`}
      </AppText>
      <AppText style={[styles.message, { color: colors.textSecondary }]}>
        過去に書いた記録の文章は変わりません
      </AppText>
      <View style={styles.actions}>
        <Button variant="outline" label="キャンセル" onPress={onCancel} />
        <Button variant="outline" tone="danger" label="削除する" onPress={onConfirm} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  quote: { marginBottom: space[2] },
  message: { marginBottom: space[4] },
  actions: { gap: space[3] },
});
