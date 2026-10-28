import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';

type HintProps = {
  text: string;
  /** 一度入れたヒント。面を surface-2 にして「✓」を出す（もう一度押しても入れられる） */
  used: boolean;
  onPress: () => void;
};

/** 読後メモのヒント（docs/design-system/components/Hint/README.md）。丸いボタンに明朝の文と「＋」。 */
export function Hint({ text, used, onPress }: HintProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ checked: used }}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, used && styles.used, pressed && styles.pressed]}
    >
      <AppText variant="starter" style={styles.text}>
        {text}
      </AppText>
      <AppText variant="body" style={styles.mark}>
        {used ? '✓' : '＋'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[3],
    minHeight: size.touchMin,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface1,
  },
  used: { backgroundColor: colors.surface2 },
  pressed: { backgroundColor: colors.surface2 },
  text: { color: colors.textPrimary, flexShrink: 1 },
  mark: { color: colors.textSecondary },
});
