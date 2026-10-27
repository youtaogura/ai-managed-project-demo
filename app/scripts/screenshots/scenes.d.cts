import type { MediaRecord } from '../../src/types/record';
import type { Shelf } from '../../src/types/shelf';

export type SceneAction = { label: string } | { text: string };
export type SceneData = { records?: MediaRecord[]; shelves?: Shelf[]; starterSettings?: unknown };
export type Scene = {
  name: string;
  data: () => SceneData;
  url: string;
  actions?: SceneAction[];
  waitFor: string;
};

export const STORAGE_KEYS: { records: string; shelves: string; starterSettings: string };
export const SCENES: Scene[];
export function parseSceneArgs(argv: string[], scenes?: Scene[]): Scene[];
