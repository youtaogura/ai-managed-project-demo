import type { MediaRecord } from '../types/record';
import { HERO_CRITERIA_IDS, type AppSettings, type HeroCriterion } from '../types/settings';
import { recentlyFinished } from './yearCounter';

export const HERO_LIMIT = 10;
export const HERO_RATING_THRESHOLD = 4;

export type HeroCriterionDef = {
  id: HeroCriterion;
  /** 設定での条件名。 */
  label: string;
  /** 一覧の見出し。出さない条件は null。 */
  title: string | null;
  /** 設定シートの補足。なければ null。 */
  description: string | null;
  /** 絞り込みと並び順（件数の制限は selectHeroRecords が行う）。 */
  select(
    records: readonly MediaRecord[],
    enabledFields?: AppSettings['enabledFields'],
  ): MediaRecord[];
};

const newerFirst = (a: string, b: string) => b.localeCompare(a);

function inProgress(records: readonly MediaRecord[]): MediaRecord[] {
  return records
    .filter((record) => record.status === 'in_progress')
    .sort((a, b) => {
      if (a.startDate !== null && b.startDate === null) return -1;
      if (a.startDate === null && b.startDate !== null) return 1;
      return (
        newerFirst(a.startDate ?? '', b.startDate ?? '') || newerFirst(a.updatedAt, b.updatedAt)
      );
    });
}

function highRated(records: readonly MediaRecord[]): MediaRecord[] {
  return records
    .filter((record) => record.rating !== null && record.rating >= HERO_RATING_THRESHOLD)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || newerFirst(a.createdAt, b.createdAt));
}

function planned(records: readonly MediaRecord[]): MediaRecord[] {
  return records
    .filter((record) => record.status === 'planned')
    .sort((a, b) => newerFirst(a.createdAt, b.createdAt));
}

/** 条件を足すときは、HERO_CRITERIA_IDS とこのテーブルに 1 件足す。 */
export const HERO_CRITERIA: Record<HeroCriterion, HeroCriterionDef> = {
  recent: {
    id: 'recent',
    label: '最近読み終えた・見終えた',
    title: '最近読み終えた・見終えた',
    description: '終えた日の新しい順',
    select: (records, enabledFields) => recentlyFinished(records, records.length, enabledFields),
  },
  inProgress: {
    id: 'inProgress',
    label: '今読んでる・見てる',
    title: '今読んでる・見てる',
    description: '読んでる・見てるの作品',
    select: inProgress,
  },
  highRated: {
    id: 'highRated',
    label: '評価の高い作品',
    title: '評価の高い作品',
    description: 'レーティング 4.0 以上を高い順',
    select: highRated,
  },
  planned: {
    id: 'planned',
    label: '読みたい・見たい',
    title: '読みたい・見たい',
    description: 'これから読む・見る作品',
    select: planned,
  },
  none: { id: 'none', label: '表示しない', title: null, description: null, select: () => [] },
};

/** シートに並べる選択肢。 */
export const HERO_CRITERION_OPTIONS: readonly HeroCriterionDef[] = HERO_CRITERIA_IDS.map(
  (id) => HERO_CRITERIA[id],
);

export function selectHeroRecords(
  records: readonly MediaRecord[],
  criterion: HeroCriterion,
  enabledFields?: AppSettings['enabledFields'],
): MediaRecord[] {
  return HERO_CRITERIA[criterion].select(records, enabledFields).slice(0, HERO_LIMIT);
}
