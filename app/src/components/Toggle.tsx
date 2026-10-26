import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

const ROW_MIN_HEIGHT = 52;

type ToggleProps = {
  label: string;
  /** ラベルの下に出す補足 */
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

// 行全体がタップ領域のスイッチ。読み上げは行に 1 回（Switch 自体は読み上げから外す）
export function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <View style={styles.text}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="micro" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.lineStrong }}
        thumbColor={value ? colors.accentInk : colors.textTertiary}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: Math.max(ROW_MIN_HEIGHT, size.touchMin),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[2],
  },
  text: { flex: 1, gap: space[1] },
  description: { color: colors.textTertiary },
});
