import type { AddTarget } from '../components/AddSheet';
import { MEDIA_KINDS, type MediaKind, type MediaRecord } from '../types/record';

const BOOK_KINDS: readonly MediaKind[] = ['book', 'manga'];
const VIDEO_KINDS: readonly MediaKind[] = ['movie', 'drama', 'anime'];

/** 切り替え。結果は `MEDIA_KINDS` 順。外すと空になるときは入力をそのまま返す。 */
export function toggleKind(enabled: readonly MediaKind[], kind: MediaKind): MediaKind[] {
  const next = MEDIA_KINDS.filter((k) => (k === kind ? !enabled.includes(k) : enabled.includes(k)));
  return next.length === 0 ? [...enabled] : next;
}

export function filterRecordsByKinds<T extends Pick<MediaRecord, 'kind'>>(
  records: readonly T[],
  enabled: readonly MediaKind[],
): T[] {
  return records.filter((record) => enabled.includes(record.kind));
}

/** 使う種別でなければ、同じ系統（本・漫画 / 映画・ドラマ・アニメ）の先頭、なければ使う種別の先頭。 */
export function resolveInitialKind(
  requested: MediaKind | undefined,
  enabled: readonly MediaKind[],
): MediaKind {
  const wanted = requested ?? 'book';
  if (enabled.includes(wanted)) return wanted;
  const family = BOOK_KINDS.includes(wanted) ? BOOK_KINDS : VIDEO_KINDS;
  const sameFamily = MEDIA_KINDS.find((k) => family.includes(k) && enabled.includes(k));
  return sameFamily ?? enabled[0] ?? wanted;
}

/** フォームの種別の選択肢: 使う種別 ∪ 記録の元の種別（`MEDIA_KINDS` 順）。 */
export function formKindOptions(
  enabled: readonly MediaKind[],
  originalKind?: MediaKind,
): MediaKind[] {
  return MEDIA_KINDS.filter((k) => enabled.includes(k) || k === originalKind);
}

export function firstMediaKind(enabled: readonly MediaKind[]): MediaKind | undefined {
  return VIDEO_KINDS.find((k) => enabled.includes(k));
}

/** 追加シートに出す入口の一覧。 */
export function addEntries(
  enabled: readonly MediaKind[],
  mediaSearchEnabled: boolean,
): AddTarget[] {
  const entries: AddTarget[] = [];
  if (BOOK_KINDS.some((k) => enabled.includes(k))) entries.push('scan', 'search', 'isbn', 'manual');
  if (firstMediaKind(enabled) !== undefined) {
    if (mediaSearchEnabled) entries.push('mediaSearch');
    entries.push('mediaManual');
  }
  return entries;
}
