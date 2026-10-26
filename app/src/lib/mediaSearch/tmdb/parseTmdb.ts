import type { MediaCandidate } from '../../../types/mediaSearch';

type TmdbMediaType = MediaCandidate['mediaType'];

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';
const ANIMATION_GENRE_ID = 16;
const MAX_CREATORS = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function parseYear(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const head = value.slice(0, 4);
  return /^\d{4}$/.test(head) ? head : null;
}

function parseCandidate(item: unknown, mediaType: TmdbMediaType): MediaCandidate | null {
  if (!isRecord(item)) return null;
  const id = item.id;
  if (typeof id !== 'number' || !Number.isInteger(id)) return null;
  const isMovie = mediaType === 'movie';
  const title =
    nonBlank(isMovie ? item.title : item.name) ??
    nonBlank(isMovie ? item.original_title : item.original_name);
  if (title === null) return null;
  const posterPath = nonBlank(item.poster_path);
  const genreIds = Array.isArray(item.genre_ids) ? item.genre_ids : [];
  return {
    mediaType,
    tmdbId: String(id),
    title,
    creator: null,
    year: parseYear(isMovie ? item.release_date : item.first_air_date),
    posterUrl: posterPath === null ? null : `${POSTER_BASE}${posterPath}`,
    isAnimation: genreIds.includes(ANIMATION_GENRE_ID),
  };
}

/** 検索応答の results を検証して候補にする。results が配列でなければ null。 */
export function parseSearchResults(
  json: unknown,
  mediaType: TmdbMediaType,
): MediaCandidate[] | null {
  if (!isRecord(json) || !Array.isArray(json.results)) return null;
  const candidates: MediaCandidate[] = [];
  for (const item of json.results) {
    const candidate = parseCandidate(item, mediaType);
    if (candidate !== null) candidates.push(candidate);
  }
  return candidates;
}

function joinNames(names: unknown[]): string | null {
  const picked = names
    .map((name) => nonBlank(name))
    .filter((name): name is string => name !== null)
    .slice(0, MAX_CREATORS);
  return picked.length === 0 ? null : picked.join('、');
}

/** 詳細応答から監督（movie）／制作者（tv）を取り出す。取れなければ null。 */
export function parseCreators(json: unknown, mediaType: TmdbMediaType): string | null {
  if (!isRecord(json)) return null;
  if (mediaType === 'tv') {
    if (!Array.isArray(json.created_by)) return null;
    return joinNames(json.created_by.map((person) => (isRecord(person) ? person.name : null)));
  }
  const credits = json.credits;
  if (!isRecord(credits) || !Array.isArray(credits.crew)) return null;
  const directors = credits.crew.filter(
    (member): member is Record<string, unknown> => isRecord(member) && member.job === 'Director',
  );
  return joinNames(directors.map((member) => member.name));
}
