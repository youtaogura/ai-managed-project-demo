import type { NewRecordInput } from '../types/record';
import type { RecordFieldKey } from '../types/settings';

/** 記録するかどうかを選べる項目。設定画面に出す順。 */
export const RECORD_FIELDS: readonly RecordFieldKey[] = [
  'rating',
  'status',
  'startDate',
  'endDate',
  'review',
  'photo',
];

export type EnabledFields = Record<RecordFieldKey, boolean>;

export const RECORD_FIELD_LABELS: Record<RecordFieldKey, string> = {
  rating: 'レーティング',
  status: 'ステータス',
  startDate: '始めた日',
  endDate: '終えた日',
  review: '感想',
  photo: '写真',
};

export const ALL_FIELDS_ENABLED: EnabledFields = Object.fromEntries(
  RECORD_FIELDS.map((key) => [key, true]),
) as EnabledFields;

/** 新しい記録の既定値。ステータスがオフなら「完了」で始める。 */
export function newRecordDefaults(
  enabledFields: EnabledFields,
  today: string,
): Partial<NewRecordInput> {
  if (enabledFields.status) return {};
  return { status: 'completed', endDate: enabledFields.endDate ? today : null };
}

export function withFieldToggled(
  enabledFields: EnabledFields,
  key: RecordFieldKey,
  value: boolean,
): EnabledFields {
  return { ...enabledFields, [key]: value };
}
