import { makeRecord } from '../../testUtils';
import { BACKUP_FORMAT } from '../../types/backup';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { buildBackup, parseBackup } from '../backup';

const AT = '2026-10-26T01:02:03.000Z';

function text(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: AT,
    records: [makeRecord()],
    settings: null,
    ...overrides,
  });
}

describe('buildBackup', () => {
  it('形式を付け、photoUri を null にし、入力は書き換えない', () => {
    const records = [makeRecord({ id: 'a', photoUri: 'file:///p.jpg', title: '作品' })];
    const settings = { ...DEFAULT_SETTINGS, enabledKinds: ['book' as const] };
    const backup = buildBackup(records, settings, AT);
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: 1, exportedAt: AT });
    expect(backup.records).toEqual([{ ...records[0], photoUri: null }]);
    expect(backup.settings).toEqual(settings);
    expect(records[0]?.photoUri).toBe('file:///p.jpg');
  });
});

describe('parseBackup', () => {
  it('書き出し → 文字列 → 読み戻しで photoUri 以外が一致する', () => {
    const records = [
      makeRecord({ id: 'a', photoUri: 'file:///p.jpg', rating: 4.5, review: '感想\n"x"' }),
      makeRecord({ id: 'b', kind: 'movie', status: 'completed', endDate: '2024-02-01' }),
    ];
    const result = parseBackup(JSON.stringify(buildBackup(records, DEFAULT_SETTINGS, AT)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.records).toEqual(records.map((r) => ({ ...r, photoUri: null })));
    expect(result.backup.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.backup.exportedAt).toBe(AT);
  });

  it('JSON でないと not_json', () => {
    expect(parseBackup('{')).toEqual({ ok: false, reason: 'not_json' });
  });

  it('形式が違う・version が整数でないと not_backup', () => {
    expect(parseBackup('[]')).toEqual({ ok: false, reason: 'not_backup' });
    expect(parseBackup('null')).toEqual({ ok: false, reason: 'not_backup' });
    expect(parseBackup(text({ format: 'other' }))).toEqual({ ok: false, reason: 'not_backup' });
    expect(parseBackup(text({ version: '1' }))).toEqual({ ok: false, reason: 'not_backup' });
    expect(parseBackup(text({ version: 1.5 }))).toEqual({ ok: false, reason: 'not_backup' });
  });

  it('新しい version は too_new', () => {
    expect(parseBackup(text({ version: 2 }))).toEqual({ ok: false, reason: 'too_new' });
  });

  it('records が配列でない・1 件でも不正・重複 ID・exportedAt 不正は invalid', () => {
    const invalid = { ok: false, reason: 'invalid' };
    expect(parseBackup(text({ records: {} }))).toEqual(invalid);
    expect(parseBackup(text({ records: [makeRecord(), { id: 'x' }] }))).toEqual(invalid);
    expect(parseBackup(text({ records: [makeRecord(), makeRecord()] }))).toEqual(invalid);
    expect(parseBackup(text({ exportedAt: 'いつか' }))).toEqual(invalid);
    expect(parseBackup(text({ exportedAt: 5 }))).toEqual(invalid);
  });

  it('0 件でも読める', () => {
    const result = parseBackup(text({ records: [] }));
    expect(result.ok && result.backup.records).toEqual([]);
  });

  it('settings はフィールドごとに検証し、なければ null', () => {
    const result = parseBackup(
      text({ settings: { enabledKinds: ['movie', 'unknown'], heroCriterion: 'bad' } }),
    );
    expect(result.ok && result.backup.settings).toEqual({
      enabledKinds: ['movie'],
      heroCriterion: DEFAULT_SETTINGS.heroCriterion,
    });
    const none = parseBackup(text({ settings: undefined }));
    expect(none.ok && none.backup.settings).toBeNull();
  });
});
