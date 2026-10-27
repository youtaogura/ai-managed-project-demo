import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useShelfPick } from '../hooks/useShelfPick';
import { usePhotoService } from '../hooks/usePhotoService';
import { formatDateDisplay } from '../lib/date';
import {
  applyStatusChange,
  createFormValues,
  todayString,
  toNewRecordInput,
  validateForm,
  type RecordFormErrors,
  type RecordFormValues,
} from '../lib/recordForm';
import { getCreatorLabel, getDateHint, getDateLabels, getStatusLabel } from '../lib/statusLabel';
import { RECORD_STATUSES, type NewRecordInput, type SpineColor } from '../types/record';
import { AppText } from './AppText';
import { Button } from './Button';
import { ChipGroup, ChipMultiGroup, DashedChip } from './Chip';
import { DatePickerSheet } from './DatePickerSheet';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';
import { ShelfCreateSheet } from './ShelfCreateSheet';
import { Spine } from './Spine';
import { SpineColorPicker } from './SpineColorPicker';
import { DateFieldButton, TextField } from './TextField';

const PREVIEW_ID = 'preview';

type RecordFormProps = {
  initialValues?: Partial<NewRecordInput>;
  /** 追加のときの背表紙の色の初期値（編集では initialValues.spineColor が先） */
  initialSpineColor?: SpineColor;
  /** 編集する記録の ID。プレビューの背表紙の大きさに使う */
  recordId?: string;
  submitLabel?: string;
  onSubmit: (input: NewRecordInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  /** 保存が完了したあとに呼ばれる（遷移用） */
  onSaved?: () => void;
  /** 削除が完了し、写真の後片付けまで済んだあとに呼ばれる（遷移用） */
  onDeleted?: () => void;
};

export function RecordForm({
  initialValues,
  initialSpineColor,
  recordId,
  submitLabel = '棚に並べる',
  onSubmit,
  onDelete,
  onSaved,
  onDeleted,
}: RecordFormProps) {
  const bottomInset = useBottomInset();
  const [values, setValues] = useState<RecordFormValues>(() =>
    createFormValues(initialValues, initialSpineColor),
  );
  const [errors, setErrors] = useState<RecordFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<'start' | 'end' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [shelfCreating, setShelfCreating] = useState(false);
  const { shelves, create: createShelf } = useShelfPick();
  const photoService = usePhotoService();

  const setField = <K extends keyof RecordFormValues>(key: K, value: RecordFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const statusOptions = RECORD_STATUSES.map((value) => ({
    value,
    label: getStatusLabel(value),
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
    // 削除済みの本棚の ID は保存しない
    const existing = new Set(shelves.map((shelf) => shelf.id));
    const shelfIds = values.shelfIds.filter((id) => existing.has(id));
    await run(async () => {
      await onSubmit(toNewRecordInput({ ...values, shelfIds }, initialValues));
      onSaved?.();
    }, '保存に失敗しました');
  };

  const toggleShelf = (id: string) => {
    setValues((prev) => ({
      ...prev,
      shelfIds: prev.shelfIds.includes(id) ? prev.shelfIds.filter((x) => x !== id) : [...prev.shelfIds, id],
    }));
  };

  const handleCreateShelf = async (name: string) => {
    const shelf = await createShelf(name);
    setValues((prev) => ({ ...prev, shelfIds: [...prev.shelfIds, shelf.id] }));
  };

  const handleDelete = async (remove: () => Promise<void>) => {
    await run(async () => {
      await remove();
      const photoUri = initialValues?.photoUri;
      if (photoUri) void photoService.remove(photoUri);
      onDeleted?.();
    }, '削除に失敗しました');
  };

  const labels = getDateLabels();
  const openLabel = openDate === 'start' ? labels.start : labels.end;
  const openValue = openDate === 'start' ? values.startDate : values.endDate;
  const previewRecord = {
    id: recordId ?? PREVIEW_ID,
    title: values.title.trim(),
    creator: values.creator.trim() === '' ? null : values.creator.trim(),
    status: values.status,
    favorite: initialValues?.favorite ?? false,
    spineColor: values.spineColor,
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.spineRow}>
          <View style={styles.preview}>
            <Spine record={previewRecord} />
          </View>
          <View style={styles.colors}>
            <AppText variant="label" style={styles.heading}>
              背表紙の色
            </AppText>
            <SpineColorPicker value={values.spineColor} onChange={(c) => setField('spineColor', c)} />
            <AppText variant="label" style={styles.note}>
              棚に並べたときの色。あとから変えられます
            </AppText>
          </View>
        </View>

        <TextField
          label="タイトル"
          required
          variant="reading"
          value={values.title}
          error={errors.title}
          onChangeText={(text) => setField('title', text)}
        />
        <TextField
          label={getCreatorLabel()}
          value={values.creator}
          onChangeText={(text) => setField('creator', text)}
        />
        <View style={styles.pair}>
          <View style={styles.half}>
            <TextField label="出版社" value={values.publisher} onChangeText={(text) => setField('publisher', text)} />
          </View>
          <View style={styles.half}>
            <TextField label="ISBN" keyboardType="number-pad" value={values.isbn} onChangeText={(text) => setField('isbn', text)} />
          </View>
        </View>

        <View>
          <AppText variant="label" style={styles.heading}>
            ステータス
          </AppText>
          <ChipGroup
            label="ステータス"
            options={statusOptions}
            value={values.status}
            onChange={changeStatus}
          />
        </View>

        <View>
          <View style={styles.pair}>
            <View style={styles.half}>
              <DateFieldButton
                label={labels.start}
                value={values.startDate ? formatDateDisplay(values.startDate) : ''}
                placeholder="—"
                error={errors.startDate}
                onPress={() => setOpenDate('start')}
              />
            </View>
            <View style={styles.half}>
              <DateFieldButton
                label={labels.end}
                value={values.endDate ? formatDateDisplay(values.endDate) : ''}
                placeholder="—"
                error={errors.endDate}
                onPress={() => setOpenDate('end')}
              />
            </View>
          </View>
          <AppText variant="micro" style={styles.note}>
            {getDateHint()}
          </AppText>
        </View>

        <View>
          <AppText variant="label" style={styles.heading}>
            本棚
          </AppText>
          <ChipMultiGroup
            label="本棚"
            options={shelves.map((shelf) => ({ value: shelf.id, label: shelf.name }))}
            value={values.shelfIds}
            onToggle={toggleShelf}
            trailing={
              <DashedChip
                label="＋ 本棚を作る"
                accessibilityLabel="本棚を作る"
                onPress={() => setShelfCreating(true)}
              />
            }
          />
          <AppText variant="label" style={styles.note}>
            「すべての本」にはいつも入ります
          </AppText>
        </View>

        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="この本を削除"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            onPress={() => setConfirmingDelete(true)}
            style={styles.delete}
          >
            <AppText variant="button" style={{ color: colors.danger }}>
              この本を削除
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space[3] + bottomInset }]}>
        {failure ? (
          <AppText variant="micro" style={styles.failure}>
            {failure}
          </AppText>
        ) : null}
        {submitting ? <ActivityIndicator accessibilityLabel="処理中" color={colors.textSecondary} /> : null}
        <Button label={submitLabel} disabled={submitting} onPress={() => void handleSubmit()} />
      </View>

      <ShelfCreateSheet
        visible={shelfCreating}
        shelves={shelves}
        onSubmit={handleCreateShelf}
        onClose={() => setShelfCreating(false)}
      />

      {openDate ? (
        <DatePickerSheet
          title={openLabel}
          value={openValue}
          onClose={() => setOpenDate(null)}
          onConfirm={(value) => {
            setField(openDate === 'start' ? 'startDate' : 'endDate', value);
            setOpenDate(null);
          }}
        />
      ) : null}

      {onDelete ? (
        <DeleteConfirmSheet
          visible={confirmingDelete}
          title={values.title}
          busy={submitting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            void handleDelete(onDelete);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space[4], gap: space[5] },
  spineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[4] },
  preview: { justifyContent: 'flex-end' },
  colors: { flex: 1 },
  heading: { color: colors.textSecondary, marginBottom: space[2] },
  note: { color: colors.textTertiary, marginTop: space[2] },
  pair: { flexDirection: 'row', gap: space[3] },
  half: { flex: 1 },
  delete: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
    paddingTop: space[3],
    paddingHorizontal: space[4],
    gap: space[2],
  },
  failure: { color: colors.danger },
});
