import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  applyStatusChange,
  createFormValues,
  hasPublisherFields,
  todayString,
  toNewRecordInput,
  validateForm,
  type RecordFormErrors,
  type RecordFormValues,
} from '../lib/recordForm';
import { getStatusLabel, KIND_LABELS } from '../lib/statusLabel';
import { colors, formColors, spacing } from '../theme';
import { MEDIA_KINDS, RECORD_STATUSES, type NewRecordInput } from '../types/record';
import { DateField } from './DateField';
import { RatingInput } from './RatingInput';
import { SegmentedControl } from './SegmentedControl';

type RecordFormProps = {
  initialValues?: Partial<NewRecordInput>;
  submitLabel?: string;
  onSubmit: (input: NewRecordInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const kindOptions = MEDIA_KINDS.map((value) => ({
  value,
  label: KIND_LABELS[value],
}));

export function RecordForm({
  initialValues,
  submitLabel = '保存',
  onSubmit,
  onDelete,
}: RecordFormProps) {
  const [values, setValues] = useState<RecordFormValues>(() => createFormValues(initialValues));
  const [errors, setErrors] = useState<RecordFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const setField = <K extends keyof RecordFormValues>(key: K, value: RecordFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const statusOptions = RECORD_STATUSES.map((value) => ({
    value,
    label: getStatusLabel(values.kind, value),
  }));

  const changeStatus = (status: RecordFormValues['status']) => {
    setValues((prev) => applyStatusChange(prev, status, todayString()));
    setErrors((prev) => ({
      ...prev,
      startDate: undefined,
      endDate: undefined,
    }));
  };

  const run = async (task: () => Promise<void>, message: string) => {
    setSubmitting(true);
    setFailure(null);
    try {
      await task();
    } catch {
      setFailure(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const found = validateForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await run(() => onSubmit(toNewRecordInput(values)), '保存に失敗しました');
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('この記録を削除しますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          void run(onDelete, '削除に失敗しました');
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SegmentedControl
        label="種別"
        options={kindOptions}
        value={values.kind}
        onChange={(kind) => setField('kind', kind)}
      />

      <View style={styles.field}>
        <Text style={styles.label}>タイトル（必須）</Text>
        <TextInput
          accessibilityLabel="タイトル"
          style={styles.input}
          value={values.title}
          onChangeText={(text) => setField('title', text)}
        />
        {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>作者・著者・監督など</Text>
        <TextInput
          accessibilityLabel="作者・著者・監督など"
          style={styles.input}
          value={values.creator}
          onChangeText={(text) => setField('creator', text)}
        />
      </View>

      {hasPublisherFields(values.kind) ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>出版社</Text>
            <TextInput
              accessibilityLabel="出版社"
              style={styles.input}
              value={values.publisher}
              onChangeText={(text) => setField('publisher', text)}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>ISBN</Text>
            <TextInput
              accessibilityLabel="ISBN"
              style={styles.input}
              value={values.isbn}
              onChangeText={(text) => setField('isbn', text)}
              keyboardType="number-pad"
            />
          </View>
        </>
      ) : null}

      <SegmentedControl
        label="ステータス"
        options={statusOptions}
        value={values.status}
        onChange={changeStatus}
      />

      <DateField
        label="開始日"
        value={values.startDate}
        error={errors.startDate}
        onChange={(text) => setField('startDate', text)}
        onToday={() => setField('startDate', todayString())}
      />
      <DateField
        label="終了日"
        value={values.endDate}
        error={errors.endDate}
        onChange={(text) => setField('endDate', text)}
        onToday={() => setField('endDate', todayString())}
      />

      <RatingInput
        value={values.rating}
        error={errors.rating}
        onChange={(text) => setField('rating', text)}
      />

      <View style={styles.field}>
        <Text style={styles.label}>感想</Text>
        <TextInput
          accessibilityLabel="感想"
          style={[styles.input, styles.multiline]}
          value={values.review}
          onChangeText={(text) => setField('review', text)}
          multiline
        />
      </View>

      {failure ? <Text style={styles.error}>{failure}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => void handleSubmit()}
        style={[styles.button, styles.primary, submitting && styles.disabled]}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : null}
        <Text style={styles.primaryText}>{submitLabel}</Text>
      </Pressable>

      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={handleDelete}
          style={[styles.button, styles.danger, submitting && styles.disabled]}
        >
          <Text style={styles.dangerText}>削除</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  field: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: formColors.border,
    backgroundColor: formColors.inputBackground,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: formColors.danger, fontSize: 13 },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
  },
  primary: { backgroundColor: colors.tint },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  danger: { borderWidth: 1, borderColor: formColors.danger },
  dangerText: { color: formColors.danger, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
