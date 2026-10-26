import { RECORD_SOURCE_PROVIDERS, type MediaRecord, type RecordSource } from '../types/record';

type Params = Record<string, string | string[] | undefined>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function isRecordSource(value: unknown): value is RecordSource {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const provider = v.provider;
  if (!(RECORD_SOURCE_PROVIDERS as readonly unknown[]).includes(provider)) return false;
  switch (provider as RecordSource['provider']) {
    case 'manual':
      return true;
    case 'openbd':
      return isNonEmptyString(v.isbn);
    case 'ndl':
      return isNonEmptyString(v.ndlId);
  }
}

export function sourceKey(source: RecordSource): string | null {
  switch (source.provider) {
    case 'manual':
      return null;
    case 'openbd':
      return `openbd:${source.isbn}`;
    case 'ndl':
      return `ndl:${source.ndlId}`;
  }
}

export function isSameWork(a: MediaRecord, b: MediaRecord): boolean {
  const keyA = sourceKey(a.source);
  const keyB = sourceKey(b.source);
  if (keyA !== null && keyB !== null && keyA === keyB) return true;
  return a.isbn !== null && b.isbn !== null && a.isbn === b.isbn;
}

export function sourceFromIsbn(isbn: string | null | undefined): RecordSource {
  return typeof isbn === 'string' && isbn !== ''
    ? { provider: 'openbd', isbn }
    : { provider: 'manual' };
}

export function sourceToParams(source: RecordSource): Record<string, string> {
  switch (source.provider) {
    case 'manual':
      return {};
    case 'openbd':
      return { sourceProvider: 'openbd', sourceId: source.isbn };
    case 'ndl':
      return { sourceProvider: 'ndl', sourceId: source.ndlId };
  }
}

function text(params: Params, key: string): string | undefined {
  const value = params[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function paramsToSource(params: Params): RecordSource {
  const provider = text(params, 'sourceProvider');
  const id = text(params, 'sourceId');
  if (id === undefined) return { provider: 'manual' };
  if (provider === 'openbd') return { provider, isbn: id };
  if (provider === 'ndl') return { provider, ndlId: id };
  return { provider: 'manual' };
}
