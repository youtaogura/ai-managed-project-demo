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

const ROW_HEIGHT = 64;

const ENTRIES: readonly { target: AddTarget; title: string; description: string }[] = [
  { target: 'scan', title: 'バーコードを読み取る', description: '本の裏のバーコードを映すだけ' },
  { target: 'search', title: 'タイトルで探す', description: 'タイトルや作者の名前から' },
  { target: 'isbn', title: 'ISBN を入力する', description: '10 桁または 13 桁の番号' },
  { target: 'manual', title: '手で入力する', description: '見つからない本、同人誌など' },
];

export function AddSheet({ visible, onClose, onSelect }: AddSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="本を追加する" showCloseButton>
      <View style={styles.list}>
        {ENTRIES.map(({ target, title, description }) => {
          const primary = target === 'scan';
          return (
            <Pressable
              key={target}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => onSelect(target)}
              style={[
                styles.row,
                primary
                  ? { backgroundColor: colors.accent }
                  : { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.lineStrong },
              ]}
            >
              <View style={styles.texts}>
                <AppText variant="button" style={primary ? { color: colors.accentInk } : undefined}>
                  {title}
                </AppText>
                <AppText
                  variant="label"
                  style={{ color: primary ? colors.accentInk : colors.textSecondary }}
                >
                  {description}
                </AppText>
              </View>
              <AppText variant="button" style={primary ? { color: colors.accentInk } : undefined}>
                ›
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[2] },
  texts: { flex: 1, gap: 2 },
  row: {
    minHeight: ROW_HEIGHT,
    borderRadius: radius.button,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
