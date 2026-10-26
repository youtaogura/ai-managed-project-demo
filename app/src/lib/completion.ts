import type { MediaRecord } from '../types/record';
import { ALL_FIELDS_ENABLED, type EnabledFields } from './recordFields';
import { todayString } from './recordForm';

/** ISO 日時（`createdAt`）を端末のローカル日付 `YYYY-MM-DD` にする。 */
export function localDateString(iso: string): string {
  return todayString(new Date(iso));
}

/**
 * 「完了した日」。終えた日がオンなら終了日、オフなら完了済みの記録の登録日。
 * 日付がなければ null。
 */
export function completionDate(
  record: MediaRecord,
  enabledFields: EnabledFields = ALL_FIELDS_ENABLED,
): string | null {
  if (enabledFields.endDate) return record.endDate;
  return record.status === 'completed' ? localDateString(record.createdAt) : null;
}
