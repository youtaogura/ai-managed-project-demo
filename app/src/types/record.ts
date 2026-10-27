import type { SPINE_COLORS } from '../lib/constants';

export const RECORD_STATUSES = ['planned', 'in_progress', 'dropped', 'completed'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const RECORD_SOURCE_PROVIDERS = ['manual', 'openbd', 'ndl'] as const;
export type RecordSourceProvider = (typeof RECORD_SOURCE_PROVIDERS)[number];

export type RecordSource =
  { provider: 'manual' } | { provider: 'openbd'; isbn: string } | { provider: 'ndl'; ndlId: string };

export type SpineColor = (typeof SPINE_COLORS)[number];

export type StarterEntry = {
  id: string;
  starter: string;
  text: string;
  createdAt: string;
};

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

export type FreeTextEntry = {
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
  /** 「ひとことで言うと、」の続き */
  oneLiner: string | null;
  starters: StarterEntry[];
  quotes: QuoteEntry[];
  memos: MemoEntry[];
  freeTexts: FreeTextEntry[];
  favorite: boolean;
  spineColor: SpineColor;
  shelfIds: string[];
};

export type NewRecordInput = Omit<MediaRecord, 'id' | 'createdAt' | 'updatedAt' | 'spineColor'> & {
  spineColor?: SpineColor;
};
