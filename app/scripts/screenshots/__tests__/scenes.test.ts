import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseRecords } from '../../../src/lib/recordGuard';
import { migrateRecords } from '../../../src/lib/recordMigration';
import { SHELVES_STORAGE_KEY } from '../../../src/lib/shelfRepository';
import { parseShelves } from '../../../src/lib/shelfGuard';
import { STARTER_SETTINGS_STORAGE_KEY } from '../../../src/lib/starterSettingsStore';
import { RECORDS_STORAGE_KEY } from '../../../src/lib/recordRepository';
import { SCENES, STORAGE_KEYS, parseSceneArgs } from '../scenes.cjs';

const SCREENS_DIR = join(__dirname, '..', '..', '..', '..', 'docs', 'design-system', 'screens');

describe('SCENES', () => {
  it('名前が重複しない', () => {
    const names = SCENES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('デザインの画像（scan.png を除く）すべてにシーンがある', () => {
    const images = readdirSync(SCREENS_DIR)
      .filter((f) => f.endsWith('.png') && f !== 'scan.png')
      .map((f) => f.replace(/\.png$/, ''));
    expect(images.length).toBeGreaterThan(0);
    const names = SCENES.map((s) => s.name);
    for (const image of images) expect(names).toContain(image);
    expect(names).not.toContain('scan');
  });

  it.each(SCENES.map((s) => [s.name, s] as const))('%s のシードがアプリの読み込みを通る', async (_name, scene) => {
    const { records = [], shelves = [] } = scene.data();
    const raw = JSON.stringify(records);
    expect(parseRecords(JSON.parse(raw))).toEqual(records);
    expect(parseShelves(JSON.parse(JSON.stringify(shelves)))).toEqual(shelves);

    const data = new Map<string, string>([[RECORDS_STORAGE_KEY, raw]]);
    const ok = await migrateRecords({
      getItem: async (key) => data.get(key) ?? null,
      setItem: async (key, value) => {
        data.set(key, value);
      },
      removeItem: async (key) => {
        data.delete(key);
      },
    });
    expect(ok).toBe(true);
    expect(parseRecords(JSON.parse(data.get(RECORDS_STORAGE_KEY) ?? '[]'))).toEqual(records);
  });

  it('url は / から始まり、待つ文言がある', () => {
    for (const scene of SCENES) {
      expect(scene.url.startsWith('/')).toBe(true);
      expect(scene.waitFor).not.toBe('');
    }
  });
});

describe('STORAGE_KEYS', () => {
  it('アプリ側の定数と一致する', () => {
    expect(STORAGE_KEYS.records).toBe(RECORDS_STORAGE_KEY);
    expect(STORAGE_KEYS.shelves).toBe(SHELVES_STORAGE_KEY);
    expect(STORAGE_KEYS.starterSettings).toBe(STARTER_SETTINGS_STORAGE_KEY);
  });
});

describe('parseSceneArgs', () => {
  it('指定なしは全部', () => {
    expect(parseSceneArgs([])).toEqual(SCENES);
    expect(parseSceneArgs(['--'])).toEqual(SCENES);
  });

  it('名前で絞り込める', () => {
    expect(parseSceneArgs(['--', 'shelf', 'reading']).map((s) => s.name)).toEqual(['shelf', 'reading']);
  });

  it('未知の名前はエラー', () => {
    expect(() => parseSceneArgs(['shelf', 'nothing'])).toThrow('nothing');
  });
});
