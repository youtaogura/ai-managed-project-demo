import { createMemoryStorage } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { createSettingsStore, parseSettings, SETTINGS_STORAGE_KEY } from '../settingsStore';
import type { KeyValueStorage } from '../storage';

const ALL = ['book', 'manga', 'movie', 'drama', 'anime'];
const FIELDS_ON = {
  rating: true,
  status: true,
  startDate: true,
  endDate: true,
  review: true,
  photo: true,
};
const DEFAULTS = { enabledKinds: ALL, enabledFields: FIELDS_ON };

describe('parseSettings', () => {
  it('保存がないときはすべての種別・すべての項目', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
  });

  it('既定値は呼び出しごとに別の配列（共有の既定値を壊さない）', () => {
    parseSettings(null).enabledKinds.pop();
    parseSettings(null).enabledFields.rating = false;
    expect(DEFAULT_SETTINGS.enabledKinds).toEqual(ALL);
    expect(DEFAULT_SETTINGS.enabledFields.rating).toBe(true);
  });

  it.each([
    ['JSON でない', 'not json'],
    ['オブジェクトでない', '[1]'],
    ['null', 'null'],
    ['enabledKinds が配列でない', '{"enabledKinds":"book"}'],
    ['enabledKinds がない', '{}'],
    ['有効な種別が 1 つもない', '{"enabledKinds":["x",1]}'],
    ['空配列', '{"enabledKinds":[]}'],
  ])('%s ときは既定値', (_name, raw) => {
    expect(parseSettings(raw)).toEqual(DEFAULTS);
  });

  it('未知の種別を捨て、重複を除き、MEDIA_KINDS の順にそろえる', () => {
    expect(parseSettings('{"enabledKinds":["anime","x","book","anime"]}')).toEqual({
      enabledKinds: ['book', 'anime'],
      enabledFields: FIELDS_ON,
    });
  });

  it('#48 の保存値（enabledFields なし）は、種別そのまま・項目はすべてオン', () => {
    expect(parseSettings('{"enabledKinds":["book"]}')).toEqual({
      enabledKinds: ['book'],
      enabledFields: FIELDS_ON,
    });
  });

  it('項目のオン・オフを読み込み、種別とは独立している', () => {
    const result = parseSettings('{"enabledFields":{"status":false,"review":false}}');
    expect(result.enabledFields).toEqual({ ...FIELDS_ON, status: false, review: false });
    expect(result.enabledKinds).toEqual(ALL);
  });

  it('真偽値でない項目だけ既定値（オン）。未知のキーは捨てる', () => {
    const result = parseSettings(
      '{"enabledFields":{"rating":"no","status":false,"endDate":1,"title":false}}',
    );
    expect(result.enabledFields).toEqual({ ...FIELDS_ON, status: false });
  });

  it.each(['"x"', '[1]', 'null', '5'])('enabledFields が %s のときは項目すべてオン', (value) => {
    expect(parseSettings(`{"enabledFields":${value}}`).enabledFields).toEqual(FIELDS_ON);
  });
});

describe('createSettingsStore', () => {
  it('保存した設定を、作り直したストアで読み込める', async () => {
    const { storage, data } = createMemoryStorage();
    const settings = {
      enabledKinds: ['book' as const, 'movie' as const],
      enabledFields: { ...FIELDS_ON, review: false },
    };
    await createSettingsStore(storage).save(settings);
    expect(data.has(SETTINGS_STORAGE_KEY)).toBe(true);
    expect(await createSettingsStore(storage).load()).toEqual(settings);
  });

  it('読み込みに失敗したら既定値', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('fail');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    expect(await createSettingsStore(storage).load()).toEqual(DEFAULTS);
  });
});
