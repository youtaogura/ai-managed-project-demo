import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseRecords } from '../../../src/lib/recordGuard';
import { migrateRecords } from '../../../src/lib/recordMigration';
import { SHELVES_STORAGE_KEY } from '../../../src/lib/shelfRepository';
import { parseShelves } from '../../../src/lib/shelfGuard';
import { LAST_EXPORTED_AT_KEY, createExportStore } from '../../../src/lib/exportStore';
import { RECORDS_STORAGE_KEY } from '../../../src/lib/recordRepository';
import { WRITE_DRAFT_KEY_PREFIX, toWriteDraft } from '../../../src/lib/writeDraftStore';
import { HINTS } from '../../../src/lib/hints';
import { parseNdlResponse } from '../../../src/lib/bookSearch/ndl/parseNdlResponse';
import { NDL_SEARCH_URL, SCENES, STORAGE_KEYS, parseSceneArgs } from '../scenes.cjs';
import { makeNdlSearchXml } from '../seed.cjs';

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

  it.each(SCENES.map((s) => [s.name, s] as const))('%s の lastExportedAt がアプリの読み込みを通る', async (_name, scene) => {
    const { lastExportedAt } = scene.data();
    if (lastExportedAt !== undefined) {
      const data = new Map<string, string>([[LAST_EXPORTED_AT_KEY, lastExportedAt]]);
      const store = createExportStore({
        getItem: async (key) => data.get(key) ?? null,
        setItem: async () => {},
        removeItem: async () => {},
      });
      expect(await store.loadLastExportedAt()).toBe(lastExportedAt);
    }
  });

  it.each(SCENES.map((s) => [s.name, s] as const))('%s の下書きがアプリの読み込みを通る', (_name, scene) => {
    const { writeDrafts = {}, records = [] } = scene.data();
    const allHints = Object.values(HINTS).flat();
    for (const [recordId, draft] of Object.entries(writeDrafts)) {
      expect(records.map((r) => r.id)).toContain(recordId);
      expect(toWriteDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
      for (const hint of draft.hints) expect(allHints).toContain(hint);
    }
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
    expect(STORAGE_KEYS.lastExportedAt).toBe(LAST_EXPORTED_AT_KEY);
    expect(STORAGE_KEYS.writeDraftPrefix).toBe(WRITE_DRAFT_KEY_PREFIX);
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

describe('検索シーン', () => {
  it('title-search は「灯台」で5件の結果を返す設定で、waitFor が件数の文言', () => {
    const scene = SCENES.find((s) => s.name === 'title-search');
    expect(scene?.search?.keyword).toBe('灯台');
    expect(scene?.search?.results).toHaveLength(5);
    expect(scene?.waitFor).toBe('「灯台」の検索結果');
  });

  it('生成した XML をアプリの解析が読める（ISBN なし）', () => {
    const scene = SCENES.find((s) => s.name === 'title-search');
    const results = scene?.search?.results ?? [];
    const candidates = parseNdlResponse(makeNdlSearchXml(results));
    expect(candidates).toHaveLength(5);
    expect(candidates[0]).toMatchObject({ title: '灯台守のレシピ帳', author: '坂井ほのか', publisher: '[出版社名]', publishedYear: '2025', isbn: null });
  });

  it('XML の特殊文字をエスケープする', () => {
    const xml = makeNdlSearchXml([{ title: 'A & B <C>', author: 'x', publisher: 'y', year: '2020' }]);
    expect(parseNdlResponse(xml)[0].title).toBe('A & B <C>');
  });

  it('検索のないシーンは search を持たない', () => {
    expect(SCENES.find((s) => s.name === 'shelf')?.search).toBeUndefined();
    expect(NDL_SEARCH_URL).toContain('ndlsearch.ndl.go.jp/api/opensearch');
  });
});
