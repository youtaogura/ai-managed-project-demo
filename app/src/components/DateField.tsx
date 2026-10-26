import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, formColors, spacing } from '../theme';

type DateFieldProps = {
  label: string;
  value: string;
  error?: string;
  onChange: (text: string) => void;
  onToday: () => void;
};

export function DateField({ label, value, error, onChange, onToday }: DateFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}を今日にする`}
          onPress={onToday}
          style={styles.button}
        >
          <Text style={styles.buttonText}>今日</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}をクリア`}
          onPress={() => onChange('')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>クリア</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: formColors.border,
    backgroundColor: formColors.inputBackground,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  button: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  buttonText: { color: colors.tint, fontSize: 14 },
  error: { color: formColors.danger, fontSize: 13 },
});
