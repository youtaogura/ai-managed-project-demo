import { XMLParser, XMLValidator } from 'fast-xml-parser';

import type { BookCandidate } from '../../../types/bookSearch';
import { toIsbn13 } from '../../isbn';

export class NdlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NdlParseError';
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  isArray: (name) =>
    name === 'item' ||
    name === 'dc:identifier' ||
    name === 'dc:publisher' ||
    name === 'dc:creator' ||
    name === 'category',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string | null {
  const raw = isRecord(value) ? value['#text'] : value;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const text = String(raw).trim();
    return text === '' ? null : text;
  }
  return null;
}

function firstText(value: unknown): string | null {
  for (const entry of toArray(value)) {
    const text = textOf(entry);
    if (text !== null) return text;
  }
  return null;
}

function extractIsbn(identifiers: unknown): string | null {
  for (const entry of toArray(identifiers)) {
    if (!isRecord(entry) || entry['@_xsi:type'] !== 'dcndl:ISBN') continue;
    const text = textOf(entry);
    if (text === null) continue;
    const isbn = toIsbn13(text);
    if (isbn !== null) return isbn;
  }
  return null;
}

function extractNdlId(identifiers: unknown): string | null {
  for (const entry of toArray(identifiers)) {
    if (!isRecord(entry) || entry['@_xsi:type'] !== 'dcndl:NDLBibID') continue;
    const text = textOf(entry);
    if (text !== null) return text;
  }
  return null;
}

function extractYear(item: Record<string, unknown>): string | null {
  for (const key of ['dc:date', 'pubDate']) {
    const text = firstText(item[key]);
    const match = text === null ? null : /(?:^|\D)(\d{4})(?!\d)/.exec(text);
    if (match) return match[1];
  }
  return null;
}

function isBook(item: Record<string, unknown>): boolean {
  const categories = toArray(item.category).flatMap((entry) => {
    const text = textOf(entry);
    return text === null ? [] : [text];
  });
  return categories.length === 0 || categories.includes('図書');
}

function extractAuthor(item: Record<string, unknown>): string | null {
  return firstText(item['dc:creator']) ?? firstText(item.author);
}

function toCandidate(item: unknown): BookCandidate | null {
  if (!isRecord(item) || !isBook(item)) return null;
  const title = firstText(item.title);
  if (title === null) return null;
  return {
    title,
    author: extractAuthor(item),
    publisher: firstText(item['dc:publisher']),
    publishedYear: extractYear(item),
    isbn: extractIsbn(item['dc:identifier']),
    ndlId: extractNdlId(item['dc:identifier']),
  };
}

export function parseNdlResponse(xml: string): BookCandidate[] {
  if (xml.trim() === '' || XMLValidator.validate(xml) !== true) {
    throw new NdlParseError('XML を解析できません');
  }
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new NdlParseError('XML を解析できません');
  }
  const rss = isRecord(doc) ? doc.rss : undefined;
  const channel = isRecord(rss) ? rss.channel : undefined;
  if (channel === '') return [];
  if (!isRecord(channel)) throw new NdlParseError('RSS ではありません');
  return toArray(channel.item).flatMap((item) => {
    const candidate = toCandidate(item);
    return candidate ? [candidate] : [];
  });
}
