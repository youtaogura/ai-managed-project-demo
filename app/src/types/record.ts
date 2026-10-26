export const RECORD_STATUSES = ['planned', 'in_progress', 'dropped', 'completed'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const RECORD_SOURCE_PROVIDERS = ['manual', 'openbd', 'ndl'] as const;
export type RecordSourceProvider = (typeof RECORD_SOURCE_PROVIDERS)[number];

export type RecordSource =
  | { provider: 'manual' }
  | { provider: 'openbd'; isbn: string }
  | { provider: 'ndl'; ndlId: string };

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
  review: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  source: RecordSource;
};

export type NewRecordInput = Omit<MediaRecord, 'id' | 'createdAt' | 'updatedAt'>;
