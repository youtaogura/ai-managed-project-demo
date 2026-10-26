import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

type SettingsRowProps = {
  label: string;
  /** 2 行目に出す今の値。なければ項目名だけの 1 行になる。 */
  value?: string;
  onPress: () => void;
};

// タップして開く設定の 1 行。左に項目名と今の値、右に › を置く
export function SettingsRow({ label, value, onPress }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}、${value}` : label}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.texts}>
        <AppText variant="body">{label}</AppText>
        {value ? (
          <AppText variant="label" style={styles.value}>
            {value}
          </AppText>
        ) : null}
      </View>
      <AppText
        variant="body"
        style={styles.chevron}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        ›
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.touchMin,
    paddingVertical: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  texts: { flex: 1 },
  value: { color: colors.textSecondary },
  chevron: { color: colors.textTertiary },
});
