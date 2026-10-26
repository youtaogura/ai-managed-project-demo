import type { MediaCandidate } from '../../types/mediaSearch';

/**
 * アニメの並び: movie と tv を交互に並べ、アニメーション（isAnimation）を先、
 * それ以外を後にして limit 件まで。各グループ内は TMDb の返した順を保つ。
 */
export function orderAnimeCandidates(
  movies: MediaCandidate[],
  tvs: MediaCandidate[],
  limit: number,
): MediaCandidate[] {
  const merged: MediaCandidate[] = [];
  const length = Math.max(movies.length, tvs.length);
  for (let i = 0; i < length; i++) {
    const movie = movies[i];
    const tv = tvs[i];
    if (movie !== undefined) merged.push(movie);
    if (tv !== undefined) merged.push(tv);
  }
  const animation = merged.filter((candidate) => candidate.isAnimation);
  const others = merged.filter((candidate) => !candidate.isAnimation);
  return [...animation, ...others].slice(0, limit);
}
