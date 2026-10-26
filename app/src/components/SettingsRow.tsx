import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

type SettingsRowProps = {
  label: string;
  value: string;
  onPress: () => void;
};

// タップして値を選ぶ設定の 1 行。左に項目名と今の値、右に › を置く
export function SettingsRow({ label, value, onPress }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}、${value}`}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.texts}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="label" style={styles.value}>
          {value}
        </AppText>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  texts: { flex: 1 },
  value: { color: colors.textSecondary },
  chevron: { color: colors.textTertiary },
});
