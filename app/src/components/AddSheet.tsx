import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

export type AddTarget = 'scan' | 'search' | 'isbn' | 'manual' | 'mediaSearch' | 'mediaManual';

type AddSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (target: AddTarget) => void;
  /** 映画・ドラマ・アニメの「タイトルで探す」を出すか（API キーがあるとき）。 */
  mediaSearchEnabled: boolean;
};

const TILE_HEIGHT = 112;
const ROW_HEIGHT = 52;

export function AddSheet({ visible, onClose, onSelect, mediaSearchEnabled }: AddSheetProps) {
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
          accessibilityLabel="本をタイトルで探す"
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
        style={[styles.row, styles.gap, { backgroundColor: colors.surface2 }]}
      >
        <AppText variant="button">ISBN を入力する</AppText>
        <AppText variant="button">›</AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="本を手で入力する"
        onPress={() => onSelect('manual')}
        style={[styles.row, styles.outlined]}
      >
        <AppText variant="button">手で入力する</AppText>
        <AppText variant="button">›</AppText>
      </Pressable>
      <AppText variant="label" style={styles.group}>
        映画・ドラマ・アニメ
      </AppText>
      {mediaSearchEnabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="映画・ドラマ・アニメをタイトルで探す"
          onPress={() => onSelect('mediaSearch')}
          style={[styles.row, styles.gap, { backgroundColor: colors.surface2 }]}
        >
          <AppText variant="button">タイトルで探す</AppText>
          <AppText variant="button">›</AppText>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="映画・ドラマ・アニメを手で入力する"
        onPress={() => onSelect('mediaManual')}
        style={[styles.row, styles.outlined]}
      >
        <AppText variant="button">手で入力する</AppText>
        <AppText variant="button">›</AppText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    color: colors.textSecondary,
    marginTop: space[2],
    marginBottom: space[3],
  },
  tiles: { flexDirection: 'row', gap: space[2], marginBottom: space[2] },
  tile: {
    flex: 1,
    minHeight: TILE_HEIGHT,
    borderRadius: radius.button,
    padding: space[4],
    justifyContent: 'flex-end',
  },
  outlined: { borderWidth: 1, borderColor: colors.lineStrong },
  gap: { marginBottom: space[2] },
  row: {
    minHeight: ROW_HEIGHT,
    borderRadius: radius.button,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
