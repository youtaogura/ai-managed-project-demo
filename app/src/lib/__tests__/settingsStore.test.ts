import { createMemoryStorage } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { createSettingsStore, parseSettings, SETTINGS_STORAGE_KEY } from '../settingsStore';
import type { KeyValueStorage } from '../storage';

const DEFAULTS = { heroCriterion: 'recent', defaultStatus: 'completed' };

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

  it('古い enabledKinds は無視し、ほかの項目は読む', () => {
    expect(
      parseSettings('{"enabledKinds":["movie"],"heroCriterion":"none","defaultStatus":"planned"}'),
    ).toEqual({ heroCriterion: 'none', defaultStatus: 'planned' });
  });
});

describe('createSettingsStore', () => {
  it('保存した設定を、作り直したストアで読み込める', async () => {
    const { storage, data } = createMemoryStorage();
    await createSettingsStore(storage).save({
      heroCriterion: 'recent',
      defaultStatus: 'completed',
    });
    expect(data.get(SETTINGS_STORAGE_KEY)).toBe(
      '{"heroCriterion":"recent","defaultStatus":"completed"}',
    );
    expect(await createSettingsStore(storage).load()).toEqual({
      heroCriterion: 'recent',
      defaultStatus: 'completed',
    });
  });

  it('読み込みに失敗したら既定値', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('fail');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    expect(await createSettingsStore(storage).load()).toEqual({
      heroCriterion: 'recent',
      defaultStatus: 'completed',
    });
  });
});

describe('heroCriterion の保存', () => {
  it('既定値は recent', () => {
    expect(DEFAULT_SETTINGS.heroCriterion).toBe('recent');
  });

  it('保存して読み込み直すと同じ値になり、他のフィールドは変わらない', async () => {
    const { storage } = createMemoryStorage();
    await createSettingsStore(storage).save({
      heroCriterion: 'planned',
      defaultStatus: 'completed',
    });
    expect(await createSettingsStore(storage).load()).toEqual({
      heroCriterion: 'planned',
      defaultStatus: 'completed',
    });
  });

  it.each([
    ['未知の文字列', '{"heroCriterion":"x"}'],
    ['文字列でない', '{"heroCriterion":3}'],
  ])('%s は recent', (_name, raw) => {
    expect(parseSettings(raw).heroCriterion).toBe('recent');
  });

  it('heroCriterion のない保存値でも他の項目を保つ', () => {
    expect(parseSettings('{"defaultStatus":"planned"}')).toEqual({
      heroCriterion: 'recent',
      defaultStatus: 'planned',
    });
  });
});

describe('defaultStatus の保存', () => {
  it('既定値は completed', () => {
    expect(DEFAULT_SETTINGS.defaultStatus).toBe('completed');
    expect(parseSettings(null).defaultStatus).toBe('completed');
  });

  it('保存して読み込み直すと同じ値になり、他のフィールドは変わらない', async () => {
    const { storage } = createMemoryStorage();
    await createSettingsStore(storage).save({
      heroCriterion: 'planned',
      defaultStatus: 'in_progress',
    });
    expect(await createSettingsStore(storage).load()).toEqual({
      heroCriterion: 'planned',
      defaultStatus: 'in_progress',
    });
  });

  it.each([
    ['未知の文字列', '{"defaultStatus":"x"}'],
    ['文字列でない', '{"defaultStatus":3}'],
    ['ない保存値', '{"heroCriterion":"none"}'],
  ])('%s は completed', (_name, raw) => {
    expect(parseSettings(raw).defaultStatus).toBe('completed');
  });

  it('defaultStatus のない古い保存値でも他のフィールドを保つ', () => {
    expect(parseSettings('{"heroCriterion":"none"}')).toEqual({
      heroCriterion: 'none',
      defaultStatus: 'completed',
    });
  });
});
