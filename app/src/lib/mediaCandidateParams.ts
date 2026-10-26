import type { MediaCandidate, MediaSearchKind } from '../types/mediaSearch';
import { sourceToParams } from './recordSource';

export function mediaCandidateToParams(
  candidate: MediaCandidate,
  kind: MediaSearchKind,
): Record<string, string> {
  const params: Record<string, string> = { kind, title: candidate.title };
  if (candidate.creator !== null) params.creator = candidate.creator;
  if (candidate.posterUrl !== null) params.coverUrl = candidate.posterUrl;
  Object.assign(
    params,
    sourceToParams({
      provider: 'tmdb',
      mediaType: candidate.mediaType,
      tmdbId: candidate.tmdbId,
    }),
  );
  return params;
}

export function mediaTitleOnlyParams(
  keyword: string,
  kind: MediaSearchKind,
): Record<string, string> {
  const title = keyword.trim();
  return title === '' ? { kind } : { kind, title };
}

/** 行に出す種別。アニメ検索の結果のうちアニメーションのものだけ「アニメ」。 */
export function mediaKindLabel(candidate: MediaCandidate, kind: MediaSearchKind): string {
  if (kind === 'anime' && candidate.isAnimation) return 'アニメ';
  return candidate.mediaType === 'movie' ? '映画' : 'ドラマ';
}
