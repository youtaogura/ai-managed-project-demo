import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

export type AddTarget = 'scan' | 'search' | 'isbn' | 'manual';

type AddSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (target: AddTarget) => void;
};

const TILE_HEIGHT = 112;
const ROW_HEIGHT = 52;

export function AddSheet({ visible, onClose, onSelect }: AddSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="何を記録しますか" showCloseButton>
      <AppText variant="label" style={styles.group}>
        本・漫画
      </AppText>
      <View style={styles.tiles}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="バーコードを読み取る"
          onPress={() => onSelect('scan')}
          style={[styles.tile, { backgroundColor: colors.accent }]}
        >
          <AppText variant="button" style={{ color: colors.accentInk }}>
            バーコードを読み取る
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="タイトルで探す"
          onPress={() => onSelect('search')}
          style={[styles.tile, { backgroundColor: colors.surface2 }]}
        >
          <AppText variant="button">タイトルで探す</AppText>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ISBN を入力する"
        onPress={() => onSelect('isbn')}
        style={[styles.row, { backgroundColor: colors.surface2 }]}
      >
        <AppText variant="button">ISBN を入力する</AppText>
        <AppText variant="button">›</AppText>
      </Pressable>
      <AppText variant="label" style={styles.group}>
        映画・ドラマ・アニメ、ISBN のない本
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="手で入力する"
        onPress={() => onSelect('manual')}
        style={[styles.row, { borderWidth: 1, borderColor: colors.lineStrong }]}
      >
        <AppText variant="button">手で入力する</AppText>
        <AppText variant="button">›</AppText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { color: colors.textSecondary, marginTop: space[2], marginBottom: space[3] },
  tiles: { flexDirection: 'row', gap: space[2], marginBottom: space[2] },
  tile: {
    flex: 1,
    minHeight: TILE_HEIGHT,
    borderRadius: radius.button,
    padding: space[4],
    justifyContent: 'flex-end',
  },
  row: {
    minHeight: ROW_HEIGHT,
    borderRadius: radius.button,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
