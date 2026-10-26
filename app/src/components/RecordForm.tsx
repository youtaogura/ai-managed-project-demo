import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
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
import { shelfNames } from '../lib/shelfSelectors';
import { getCreatorLabel, getDateHint, getDateLabels, getStatusLabel } from '../lib/statusLabel';
import { RECORD_STATUSES, type NewRecordInput } from '../types/record';
import { AppText } from './AppText';
import { Button } from './Button';
import { ChipGroup } from './Chip';
import { DatePickerSheet } from './DatePickerSheet';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';
import { PhotoField } from './PhotoField';
import { RatingInput } from './RatingInput';
import { SettingsRow } from './SettingsRow';
import { ShelfPickSheet } from './ShelfPickSheet';
import { DateFieldButton, TextField } from './TextField';

type RecordFormProps = {
  initialValues?: Partial<NewRecordInput>;
  submitLabel?: string;
  onSubmit: (input: NewRecordInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  /** 保存が完了し、写真の後片付けまで済んだあとに呼ばれる（遷移用） */
  onSaved?: () => void;
  /** 削除が完了し、写真の後片付けまで済んだあとに呼ばれる（遷移用） */
  onDeleted?: () => void;
};

export function RecordForm({
  initialValues,
  submitLabel = '記録する',
  onSubmit,
  onDelete,
  onSaved,
  onDeleted,
}: RecordFormProps) {
  const bottomInset = useBottomInset();
  const [values, setValues] = useState<RecordFormValues>(() => createFormValues(initialValues));
  const [errors, setErrors] = useState<RecordFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<'start' | 'end' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const { shelves, counts, create: createShelf } = useShelfPick();
  const photoService = usePhotoService();
  // 保存済みの写真は保存成功後にだけ消す。未保存の新規コピーは破棄時に消す
  const initialPhotoUri = useRef(values.photoUri);
  const currentPhotoUri = useRef(values.photoUri);
  const pendingNew = useRef(new Set<string>());
  const persisted = useRef(false);

  useEffect(() => {
    const pending = pendingNew.current;
    return () => {
      if (persisted.current) return;
      for (const uri of pending) void photoService.remove(uri);
    };
  }, [photoService]);

  const changePhoto = (next: string | null) => {
    const prev = currentPhotoUri.current;
    if (prev && pendingNew.current.delete(prev)) void photoService.remove(prev);
    if (next) pendingNew.current.add(next);
    currentPhotoUri.current = next;
    setField('photoUri', next);
  };

  const commitPhoto = () => {
    const initial = initialPhotoUri.current;
    if (initial && initial !== currentPhotoUri.current) void photoService.remove(initial);
    initialPhotoUri.current = currentPhotoUri.current;
    pendingNew.current.clear();
  };

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
    await run(async () => {
      await onSubmit(toNewRecordInput(values, initialValues));
      persisted.current = true;
      commitPhoto();
      onSaved?.();
    }, '保存に失敗しました');
  };

  const handleDelete = async (remove: () => Promise<void>) => {
    await run(async () => {
      await remove();
      persisted.current = true;
      const initial = initialPhotoUri.current;
      if (initial) void photoService.remove(initial);
      for (const uri of pendingNew.current) void photoService.remove(uri);
      pendingNew.current.clear();
      onDeleted?.();
    }, '削除に失敗しました');
  };

  const labels = getDateLabels();
  const openLabel = openDate === 'start' ? labels.start : labels.end;
  const openValue = openDate === 'start' ? values.startDate : values.endDate;
  const preview = {
    ...values,
    creator: values.creator.trim() === '' ? null : values.creator,
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoField record={preview} onChange={changePhoto} />

        <TextField
          label="タイトル"
          required
          value={values.title}
          error={errors.title}
          onChangeText={(text) => setField('title', text)}
        />
        <TextField
          label={getCreatorLabel()}
          value={values.creator}
          onChangeText={(text) => setField('creator', text)}
        />
        <>
          <TextField label="出版社" value={values.publisher} onChangeText={(text) => setField('publisher', text)} />
          <TextField label="ISBN" variant="isbn" value={values.isbn} onChangeText={(text) => setField('isbn', text)} />
        </>

        <View>
          <AppText variant="label" style={styles.heading}>
            ステータス
          </AppText>
          <ChipGroup
            label="ステータス"
            options={statusOptions}
            value={values.status}
            columns={2}
            onChange={changeStatus}
          />
        </View>

        <View>
          <View style={styles.dates}>
            <View style={styles.date}>
              <DateFieldButton
                label={labels.start}
                value={values.startDate ? formatDateDisplay(values.startDate) : ''}
                error={errors.startDate}
                onPress={() => setOpenDate('start')}
              />
            </View>
            <View style={styles.date}>
              <DateFieldButton
                label={labels.end}
                value={values.endDate ? formatDateDisplay(values.endDate) : ''}
                error={errors.endDate}
                onPress={() => setOpenDate('end')}
              />
            </View>
          </View>
          <AppText variant="micro" style={styles.hint}>
            {getDateHint()}
          </AppText>
        </View>

        <SettingsRow
          label="本棚"
          value={shelfNames(values, shelves).join('、') || 'まだ入れていません'}
          onPress={() => setShelfOpen(true)}
        />

        <RatingInput value={values.rating} error={errors.rating} onChange={(text) => setField('rating', text)} />

        {onDelete ? (
          <Button
            variant="outline"
            tone="danger"
            label="この記録を削除"
            disabled={submitting}
            onPress={() => setConfirmingDelete(true)}
          />
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

      <ShelfPickSheet
        visible={shelfOpen}
        shelves={shelves}
        counts={counts}
        selectedIds={values.shelfIds}
        onSubmit={(ids) => setField('shelfIds', ids)}
        onCreate={createShelf}
        onClose={() => setShelfOpen(false)}
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
  heading: { color: colors.textSecondary, marginBottom: space[1] },
  dates: { flexDirection: 'row', gap: space[3] },
  date: { flex: 1 },
  hint: { color: colors.textTertiary, marginTop: space[2] },
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
