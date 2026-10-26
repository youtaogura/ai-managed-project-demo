import type { BookCandidate } from '../types/bookSearch';
import { sourceToParams } from './recordSource';

export function candidateToParams(candidate: BookCandidate): Record<string, string> {
  const params: Record<string, string> = { title: candidate.title };
  if (candidate.author !== null) params.creator = candidate.author;
  if (candidate.publisher !== null) params.publisher = candidate.publisher;
  if (candidate.isbn !== null) params.isbn = candidate.isbn;
  if (candidate.ndlId !== null) {
    Object.assign(params, sourceToParams({ provider: 'ndl', ndlId: candidate.ndlId }));
  } else if (candidate.isbn !== null) {
    Object.assign(params, sourceToParams({ provider: 'openbd', isbn: candidate.isbn }));
  }
  return params;
}

export function titleOnlyParams(keyword: string): Record<string, string> {
  const title = keyword.trim();
  return title === '' ? {} : { title };
}
