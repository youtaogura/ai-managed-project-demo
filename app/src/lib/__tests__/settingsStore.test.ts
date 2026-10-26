import { createMemoryStorage } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { createSettingsStore, parseSettings, SETTINGS_STORAGE_KEY } from '../settingsStore';
import type { KeyValueStorage } from '../storage';

const DEFAULTS = { defaultStatus: 'completed' };

describe('parseSettings', () => {
  it('保存がないときは既定値', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
  });

  it.each([
    ['JSON でない', 'not json'],
    ['オブジェクトでない', '[1]'],
    ['null', 'null'],
  ])('%s ときは既定値', (_name, raw) => {
    expect(parseSettings(raw)).toEqual(DEFAULTS);
  });

  it('未知のフィールドがあっても無視し、ほかの項目は読む', () => {
    expect(parseSettings('{"unknownField":["a"],"defaultStatus":"planned"}')).toEqual({
      defaultStatus: 'planned',
    });
  });

  it('未知のフィールドだけが残っていても読み込めて、既定値になる', () => {
    expect(parseSettings('{"unknownField":"x"}')).toEqual(DEFAULTS);
  });
});

describe('createSettingsStore', () => {
  it('保存した設定を、作り直したストアで読み込める', async () => {
    const { storage, data } = createMemoryStorage();
    await createSettingsStore(storage).save({ defaultStatus: 'completed' });
    expect(data.get(SETTINGS_STORAGE_KEY)).toBe('{"defaultStatus":"completed"}');
    expect(await createSettingsStore(storage).load()).toEqual({ defaultStatus: 'completed' });
  });

  it('読み込みに失敗したら既定値', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('fail');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    expect(await createSettingsStore(storage).load()).toEqual({ defaultStatus: 'completed' });
  });
});

describe('defaultStatus の保存', () => {
  it('既定値は completed', () => {
    expect(DEFAULT_SETTINGS.defaultStatus).toBe('completed');
    expect(parseSettings(null).defaultStatus).toBe('completed');
  });

  it('保存して読み込み直すと同じ値になる', async () => {
    const { storage } = createMemoryStorage();
    await createSettingsStore(storage).save({ defaultStatus: 'in_progress' });
    expect(await createSettingsStore(storage).load()).toEqual({ defaultStatus: 'in_progress' });
  });

  it.each([
    ['未知の文字列', '{"defaultStatus":"x"}'],
    ['文字列でない', '{"defaultStatus":3}'],
    ['ない保存値', '{"unknownField":"none"}'],
  ])('%s は completed', (_name, raw) => {
    expect(parseSettings(raw).defaultStatus).toBe('completed');
  });
});
