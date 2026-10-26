import type { MediaKind } from './record';

export type MediaSearchKind = Extract<MediaKind, 'movie' | 'drama' | 'anime'>;

export type MediaCandidate = {
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  title: string;
  creator: string | null;
  year: string | null;
  posterUrl: string | null;
  isAnimation: boolean;
};

export type MediaSearchError = 'network' | 'invalid_response';

export type MediaSearchResult =
  { status: 'ok'; candidates: MediaCandidate[] } | { status: 'error'; reason: MediaSearchError };
