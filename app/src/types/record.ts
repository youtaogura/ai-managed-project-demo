export const MEDIA_KINDS = ['book', 'manga', 'movie', 'drama', 'anime'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const RECORD_STATUSES = ['planned', 'in_progress', 'dropped', 'completed'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export type MediaRecord = {
  id: string;
  kind: MediaKind;
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
};

export type NewRecordInput = Omit<MediaRecord, 'id' | 'createdAt' | 'updatedAt'>;
