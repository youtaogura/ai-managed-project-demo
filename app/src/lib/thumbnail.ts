import type { MediaRecord } from '../types/record';

export const PLACEHOLDER_LABEL = '📖';

export type ThumbnailSource = {
  kind: 'photo' | 'cover' | 'placeholder';
  uri: string | null;
};

type ThumbnailFields = Pick<MediaRecord, 'photoUri' | 'coverUrl'>;

export function getThumbnailSource(record: ThumbnailFields): ThumbnailSource {
  if (record.photoUri) return { kind: 'photo', uri: record.photoUri };
  if (record.coverUrl) return { kind: 'cover', uri: record.coverUrl };
  return { kind: 'placeholder', uri: null };
}

export function getThumbnailCandidates(record: ThumbnailFields): string[] {
  const candidates: string[] = [];
  if (record.photoUri) candidates.push(record.photoUri);
  if (record.coverUrl) candidates.push(record.coverUrl);
  return candidates;
}
