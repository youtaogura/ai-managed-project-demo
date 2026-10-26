import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { parseRating, stepRating } from '../lib/recordForm';
import { colors, formColors, spacing } from '../theme';

type RatingInputProps = {
  value: string;
  error?: string;
  onChange: (text: string) => void;
};

export function RatingInput({ value, error, onChange }: RatingInputProps) {
  const parsed = parseRating(value);
  const valid = parsed !== null && !Number.isNaN(parsed);
  const canDecrease = valid && parsed > 1;
  const canIncrease = !valid || parsed < 5;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>レーティング（1.0〜5.0）</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="レーティングを下げる"
          accessibilityState={{ disabled: !canDecrease }}
          disabled={!canDecrease}
          onPress={() => onChange(stepRating(value, -1))}
          style={[styles.step, !canDecrease && styles.stepDisabled]}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <TextInput
          accessibilityLabel="レーティング"
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="未入力"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="レーティングを上げる"
          accessibilityState={{ disabled: !canIncrease }}
          disabled={!canIncrease}
          onPress={() => onChange(stepRating(value, 1))}
          style={[styles.step, !canIncrease && styles.stepDisabled]}
        >
          <Text style={styles.stepText}>＋</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="レーティングをクリア"
          onPress={() => onChange('')}
          style={styles.clear}
        >
          <Text style={styles.clearText}>クリア</Text>
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
    width: 90,
    borderWidth: 1,
    borderColor: formColors.border,
    backgroundColor: formColors.inputBackground,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    textAlign: 'center',
    color: colors.text,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },
  stepDisabled: { backgroundColor: formColors.disabled },
  stepText: { color: '#fff', fontSize: 20 },
  clear: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  clearText: { color: colors.tint, fontSize: 14 },
  error: { color: formColors.danger, fontSize: 13 },
});
