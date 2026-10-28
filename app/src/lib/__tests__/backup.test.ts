import { makeRecord } from '../../testUtils';
import { BACKUP_FORMAT, BACKUP_VERSION } from '../constants';
import { DEFAULT_SETTINGS } from '../../types/settings';
import type { Shelf } from '../../types/shelf';
import { buildBackup, parseBackup } from '../backup';

const AT = '2026-10-26T01:02:03.000Z';
const shelves: Shelf[] = [
  { id: 'sh1', name: '積ん読', order: 0 },
  { id: 'sh2', name: '好き', order: 1 },
];

function text(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: AT,
    records: [makeRecord()],
    shelves: [],
    settings: null,
    ...overrides,
  });
}

const full = makeRecord({
  id: 'a',
  photoUri: 'file:///p.jpg',
  rating: 4.5,
  oneLiner: 'ひとこと\n"x"',
  postReadMemos: [
    { id: 'p1', text: 'いちばん心に残ったのは、嵐', createdAt: AT },
    { id: 'p2', text: '長い文章', createdAt: AT },
  ],
  quotes: [{ id: 'q1', text: '引用', page: '12-14', comment: 'いい', createdAt: AT }],
  memos: [{ id: 'm1', text: 'メモ', page: null, createdAt: AT }],
  favorite: true,
  spineColor: 'spine-7',
  shelfIds: ['sh1', 'sh2'],
});

describe('buildBackup', () => {
  it('形式を付け、photoUri を null にし、入力は書き換えない。書き出しの設定は含めない', () => {
    const records = [{ ...full, title: '作品' }];
    const settings = { ...DEFAULT_SETTINGS, defaultStatus: 'planned' as const };
    const backup = buildBackup(records, shelves, settings, AT);
    expect(backup).toMatchObject({
      format: BACKUP_FORMAT,
      version: 3,
      exportedAt: AT,
    });
    expect(backup).not.toHaveProperty('starterSettings');
    expect(backup.records).toEqual([{ ...records[0], photoUri: null }]);
    expect(backup.shelves).toEqual(shelves);
    expect(backup.settings).toEqual(settings);
    expect(records[0]?.photoUri).toBe('file:///p.jpg');
  });
});

describe('parseBackup', () => {
  it('書き出し → 文字列 → 読み戻しで photoUri 以外（読後メモを含む）が一致する', () => {
    const records = [full, makeRecord({ id: 'b', status: 'completed', endDate: '2024-02-01' })];
    const result = parseBackup(JSON.stringify(buildBackup(records, shelves, DEFAULT_SETTINGS, AT)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.records).toEqual(records.map((r) => ({ ...r, photoUri: null })));
    expect(result.backup.shelves).toEqual(shelves);
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
    expect(parseBackup(text({ version: 4 }))).toEqual({
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

  describe('版 2（書き出しがあった版）のファイル', () => {
    const legacy = {
      ...makeRecord({ id: 'old' }),
      postReadMemos: undefined,
      starters: [
        { id: 's1', starter: 'いちばん心に残ったのは、', text: ' 嵐の夜 ', createdAt: '2024-01-03T00:00:00.000Z' },
        { id: 's2', starter: '意外だったのは、', text: '  ', createdAt: '2024-01-01T00:00:00.000Z' },
      ],
      freeTexts: [{ id: 'f1', text: '長い文章', createdAt: '2024-01-02T00:00:00.000Z' }],
      quotes: [{ id: 'q1', text: '引用', page: null, comment: null, starter: '好きなのは、', createdAt: AT }],
    };
    const v2 = (overrides: Record<string, unknown> = {}) =>
      text({
        version: 2,
        records: [legacy],
        starterSettings: { enabled: true, count: 3, items: [] },
        ...overrides,
      });

    it('読み込め、書き出しと自由記述は読後メモに、引用の書き出しは外れる', () => {
      const result = parseBackup(v2());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const [record] = result.backup.records;
      expect(record?.postReadMemos).toEqual([
        { id: 'f1', text: '長い文章', createdAt: '2024-01-02T00:00:00.000Z' },
        { id: 's1', text: 'いちばん心に残ったのは、嵐の夜', createdAt: '2024-01-03T00:00:00.000Z' },
      ]);
      expect(record).not.toHaveProperty('starters');
      expect(record).not.toHaveProperty('freeTexts');
      expect(record?.quotes).toEqual([{ id: 'q1', text: '引用', page: null, comment: null, createdAt: AT }]);
    });

    it('書き出しの設定は無視する', () => {
      const result = parseBackup(v2());
      expect(result.ok && result.backup).not.toHaveProperty('starterSettings');
    });

    it('書き出しの形が壊れていれば invalid', () => {
      expect(parseBackup(v2({ records: [{ ...legacy, starters: [{ id: 's' }] }] }))).toEqual({
        ok: false,
        reason: 'invalid',
      });
    });
  });
});
