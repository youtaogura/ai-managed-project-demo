import type { NewRecordInput, RecordStatus } from '../types/record';
import { RECORD_STATUSES } from '../types/record';

/** 設定画面用の、読む系と見る系を併記した表記。 */
export const STATUS_DEFAULT_LABELS: Record<RecordStatus, string> = {
  planned: '読みたい・見たい',
  in_progress: '読んでる・見てる',
  dropped: '途中でやめた',
  completed: '読み終わった・見終わった',
};

export const STATUS_DEFAULT_OPTIONS: readonly {
  id: RecordStatus;
  label: string;
}[] = RECORD_STATUSES.map((id) => ({ id, label: STATUS_DEFAULT_LABELS[id] }));

// 日付を入れるステータスと、入れる項目。判定はここ 1 か所にまとめる
function dateFieldFor(status: RecordStatus): 'startDate' | 'endDate' | null {
  if (status === 'in_progress') return 'startDate';
  if (status === 'completed') return 'endDate';
  return null;
}

/** `initial.status` が未指定のときだけ、設定のステータス（と該当する日付の今日）を入れる。 */
export function applyDefaultStatus(
  initial: Partial<NewRecordInput>,
  status: RecordStatus,
  today: string,
): Partial<NewRecordInput> {
  if (initial.status !== undefined) return { ...initial };
  const result: Partial<NewRecordInput> = { ...initial, status };
  const field = dateFieldFor(status);
  if (field && (result[field] === undefined || result[field] === null)) result[field] = today;
  return result;
}
