import type { BookCandidate } from '../types/bookSearch';

export function candidateToParams(candidate: BookCandidate): Record<string, string> {
  const params: Record<string, string> = { kind: 'book', title: candidate.title };
  if (candidate.author !== null) params.creator = candidate.author;
  if (candidate.publisher !== null) params.publisher = candidate.publisher;
  if (candidate.isbn !== null) params.isbn = candidate.isbn;
  return params;
}

export function titleOnlyParams(keyword: string): Record<string, string> {
  const title = keyword.trim();
  return title === '' ? { kind: 'book' } : { kind: 'book', title };
}
