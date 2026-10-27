import type { MediaRecord } from '../../src/types/record';
import type { Shelf } from '../../src/types/shelf';

export function makeRecord(overrides?: Partial<MediaRecord>): MediaRecord;
export const SHELVES: Shelf[];
export function makeShelfRecords(): MediaRecord[];
export function makeReadingRecord(): MediaRecord;
export function makeFinishedRecord(): MediaRecord;
export function makeWriteRecord(): MediaRecord;
export function makeRereadRecord(): MediaRecord;
export type NdlSearchItem = { title: string; author: string; publisher: string; year: string };
export function makeNdlSearchXml(items: NdlSearchItem[]): string;
export function makeReviewRecords(year?: number): MediaRecord[];
