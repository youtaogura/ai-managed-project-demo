import { makeRecord } from '../../testUtils';
import { BACKUP_FORMAT } from '../constants';
import { DEFAULT_SETTINGS } from '../../types/settings';
import type { Shelf } from '../../types/shelf';
import { buildBackup, parseBackup } from '../backup';
import { defaultStarterSettings } from '../starterDefaults';

const AT = '2026-10-26T01:02:03.000Z';
const shelves: Shelf[] = [
  { id: 'sh1', name: '積ん読', order: 0 },
  { id: 'sh2', name: '好き', order: 1 },
];

function text(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: AT,
    records: [makeRecord()],
    shelves: [],
    starterSettings: null,
    settings: null,
    ...overrides,
  });
}

const full = makeRecord({
  id: 'a',
  photoUri: 'file:///p.jpg',
  rating: 4.5,
  oneLiner: 'ひとこと\n"x"',
  starters: [
    {
      id: 's1',
      starter: 'いちばん心に残ったのは、',
      text: '嵐',
      createdAt: AT,
    },
  ],
  quotes: [{ id: 'q1', text: '引用', page: '12-14', comment: 'いい', createdAt: AT }],
  memos: [{ id: 'm1', text: 'メモ', page: null, createdAt: AT }],
  freeTexts: [{ id: 'f1', text: '長い文章', createdAt: AT }],
  favorite: true,
  spineColor: 'spine-7',
  shelfIds: ['sh1', 'sh2'],
});

describe('buildBackup', () => {
  it('形式を付け、photoUri を null にし、入力は書き換えない', () => {
    const records = [{ ...full, title: '作品' }];
    const settings = { ...DEFAULT_SETTINGS, defaultStatus: 'planned' as const };
    const backup = buildBackup(records, shelves, defaultStarterSettings(), settings, AT);
    expect(backup).toMatchObject({
      format: BACKUP_FORMAT,
      version: 2,
      exportedAt: AT,
    });
    expect(backup.records).toEqual([{ ...records[0], photoUri: null }]);
    expect(backup.shelves).toEqual(shelves);
    expect(backup.starterSettings).toEqual(defaultStarterSettings());
    expect(backup.settings).toEqual(settings);
    expect(records[0]?.photoUri).toBe('file:///p.jpg');
  });
});

describe('parseBackup', () => {
  it('書き出し → 文字列 → 読み戻しで photoUri 以外が一致する', () => {
    const records = [full, makeRecord({ id: 'b', status: 'completed', endDate: '2024-02-01' })];
    const starterSettings = { ...defaultStarterSettings(), count: 5 as const };
    const result = parseBackup(JSON.stringify(buildBackup(records, shelves, starterSettings, DEFAULT_SETTINGS, AT)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.records).toEqual(records.map((r) => ({ ...r, photoUri: null })));
    expect(result.backup.shelves).toEqual(shelves);
    expect(result.backup.starterSettings).toEqual(starterSettings);
    expect(result.backup.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.backup.exportedAt).toBe(AT);
  });

  it('JSON でないと not_json', () => {
    expect(parseBackup('{')).toEqual({ ok: false, reason: 'not_json' });
  });

  it('形式が違う・version が整数でないと not_backup', () => {
    expect(parseBackup('[]')).toEqual({ ok: false, reason: 'not_backup' });
    expect(parseBackup('null')).toEqual({ ok: false, reason: 'not_backup' });
    expect(parseBackup(text({ format: 'other' }))).toEqual({
      ok: false,
      reason: 'not_backup',
    });
    expect(parseBackup(text({ version: '2' }))).toEqual({
      ok: false,
      reason: 'not_backup',
    });
    expect(parseBackup(text({ version: 1.5 }))).toEqual({
      ok: false,
      reason: 'not_backup',
    });
  });

  it('新しい version は too_new、version 1 は invalid', () => {
    expect(parseBackup(text({ version: 3 }))).toEqual({
      ok: false,
      reason: 'too_new',
    });
    expect(parseBackup(text({ version: 1 }))).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('records が配列でない・1 件でも不正・重複 ID・exportedAt 不正は invalid', () => {
    const invalid = { ok: false, reason: 'invalid' };
    expect(parseBackup(text({ records: {} }))).toEqual(invalid);
    expect(parseBackup(text({ records: [makeRecord(), { id: 'x' }] }))).toEqual(invalid);
    expect(parseBackup(text({ records: [makeRecord(), makeRecord()] }))).toEqual(invalid);
    expect(parseBackup(text({ exportedAt: 'いつか' }))).toEqual(invalid);
    expect(parseBackup(text({ exportedAt: 5 }))).toEqual(invalid);
  });

  it('新フィールドが欠けた記録・不正な型は invalid', () => {
    const invalid = { ok: false, reason: 'invalid' };
    const { shelfIds: _omit, ...missing } = makeRecord();
    expect(parseBackup(text({ records: [missing] }))).toEqual(invalid);
    expect(parseBackup(text({ records: [{ ...makeRecord(), quotes: 'x' }] }))).toEqual(invalid);
  });

  it('shelves が不正・重複 ID・存在しない本棚を指す shelfIds は invalid', () => {
    const invalid = { ok: false, reason: 'invalid' };
    expect(parseBackup(text({ shelves: undefined }))).toEqual(invalid);
    expect(parseBackup(text({ shelves: [{ id: 'x' }] }))).toEqual(invalid);
    expect(parseBackup(text({ shelves: [shelves[0], shelves[0]] }))).toEqual(invalid);
    expect(parseBackup(text({ records: [makeRecord({ shelfIds: ['none'] })], shelves }))).toEqual(invalid);
  });

  it('本棚は order 順に整える', () => {
    const result = parseBackup(
      text({
        shelves: [
          { id: 'b', name: 'B', order: 5 },
          { id: 'a', name: 'A', order: 2 },
        ],
      }),
    );
    expect(result.ok && result.backup.shelves).toEqual([
      { id: 'a', name: 'A', order: 0 },
      { id: 'b', name: 'B', order: 1 },
    ]);
  });

  it('0 件でも読める', () => {
    const result = parseBackup(text({ records: [] }));
    expect(result.ok && result.backup.records).toEqual([]);
  });

  it('settings はフィールドごとに検証し（未知のフィールドは無視）、なければ null', () => {
    const result = parseBackup(text({ settings: { unknownField: 'recent', defaultStatus: 'planned' } }));
    expect(result.ok && result.backup.settings).toEqual({
      defaultStatus: 'planned',
    });
    const none = parseBackup(text({ settings: undefined }));
    expect(none.ok && none.backup.settings).toBeNull();
  });

  it('starterSettings は項目ごとに検証し、なければ null', () => {
    const result = parseBackup(text({ starterSettings: { count: 9, enabled: false } }));
    expect(result.ok && result.backup.starterSettings).toEqual({
      ...defaultStarterSettings(),
      enabled: false,
    });
    const none = parseBackup(text());
    expect(none.ok && none.backup.starterSettings).toBeNull();
  });
});
