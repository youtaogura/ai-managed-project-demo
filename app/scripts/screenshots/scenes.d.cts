import type { MediaRecord } from '../../src/types/record';
import type { NdlSearchItem } from './seed.cjs';
import type { Shelf } from '../../src/types/shelf';

export type SceneAction = ({ label: string } | { text: string }) & { fill?: string };
export type SceneData = { records?: MediaRecord[]; shelves?: Shelf[]; starterSettings?: unknown };
export type Scene = {
  name: string;
  data: () => SceneData;
  url: string;
  actions?: SceneAction[];
  search?: { keyword: string; results: NdlSearchItem[] };
  waitFor: string;
};

export const STORAGE_KEYS: { records: string; shelves: string; starterSettings: string };
export const NDL_SEARCH_URL: string;
export const SCENES: Scene[];
export function parseSceneArgs(argv: string[], scenes?: Scene[]): Scene[];
