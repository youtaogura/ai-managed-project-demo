import type { SPINE_COLORS } from '../lib/constants';

export const RECORD_STATUSES = ['planned', 'in_progress', 'dropped', 'completed'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const RECORD_SOURCE_PROVIDERS = ['manual', 'openbd', 'ndl'] as const;
export type RecordSourceProvider = (typeof RECORD_SOURCE_PROVIDERS)[number];

export type RecordSource =
  { provider: 'manual' } | { provider: 'openbd'; isbn: string } | { provider: 'ndl'; ndlId: string };

export type SpineColor = (typeof SPINE_COLORS)[number];

export type QuoteEntry = {
  id: string;
  text: string;
  page: string | null;
  comment: string | null;
  createdAt: string;
};

export type MemoEntry = {
  id: string;
  text: string;
  page: string | null;
  createdAt: string;
};

/** 読後メモ。読み終えたあとに書く文章の 1 件。表示は createdAt の順。 */
export type PostReadMemo = {
  id: string;
  text: string;
  createdAt: string;
};

export type MediaRecord = {
  id: string;
  title: string;
  creator: string | null;
  publisher: string | null;
  isbn: string | null;
  coverUrl: string | null;
  photoUri: string | null;
  startDate: string | null;
  endDate: string | null;
  status: RecordStatus;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  source: RecordSource;
  /** この本をひとことで（読後メモとは別の項目） */
  oneLiner: string | null;
  /** 読後メモ（書いた順に表示する） */
  postReadMemos: PostReadMemo[];
  quotes: QuoteEntry[];
  memos: MemoEntry[];
  favorite: boolean;
  spineColor: SpineColor;
  shelfIds: string[];
};

export type NewRecordInput = Omit<MediaRecord, 'id' | 'createdAt' | 'updatedAt' | 'spineColor'> & {
  spineColor?: SpineColor;
};
