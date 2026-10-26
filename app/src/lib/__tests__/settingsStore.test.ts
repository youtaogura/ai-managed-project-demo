import { createMemoryStorage } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { createSettingsStore, parseSettings, SETTINGS_STORAGE_KEY } from '../settingsStore';
import type { KeyValueStorage } from '../storage';

const ALL = ['book', 'manga', 'movie', 'drama', 'anime'];

describe('parseSettings', () => {
  it('保存がないときはすべての種別', () => {
    expect(parseSettings(null)).toEqual({ enabledKinds: ALL, heroCriterion: 'recent' });
  });

  it('既定値は呼び出しごとに別の配列（共有の既定値を壊さない）', () => {
    parseSettings(null).enabledKinds.pop();
    expect(DEFAULT_SETTINGS.enabledKinds).toEqual(ALL);
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
    expect(parseSettings(raw)).toEqual({ enabledKinds: ALL, heroCriterion: 'recent' });
  });

  it('未知の種別を捨て、重複を除き、MEDIA_KINDS の順にそろえる', () => {
    expect(parseSettings('{"enabledKinds":["anime","x","book","anime"]}')).toEqual({
      enabledKinds: ['book', 'anime'],
      heroCriterion: 'recent',
    });
  });
});

describe('createSettingsStore', () => {
  it('保存した設定を、作り直したストアで読み込める', async () => {
    const { storage, data } = createMemoryStorage();
    await createSettingsStore(storage).save({ enabledKinds: ['book', 'movie'], heroCriterion: 'recent' });
    expect(data.get(SETTINGS_STORAGE_KEY)).toBe('{"enabledKinds":["book","movie"],"heroCriterion":"recent"}');
    expect(await createSettingsStore(storage).load()).toEqual({
      enabledKinds: ['book', 'movie'],
      heroCriterion: 'recent',
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
    expect(await createSettingsStore(storage).load()).toEqual({ enabledKinds: ALL, heroCriterion: 'recent' });
  });
});

describe('heroCriterion の保存', () => {
  it('既定値は recent', () => {
    expect(DEFAULT_SETTINGS.heroCriterion).toBe('recent');
  });

  it('保存して読み込み直すと同じ値になり、他のフィールドは変わらない', async () => {
    const { storage } = createMemoryStorage();
    await createSettingsStore(storage).save({ enabledKinds: ['book'], heroCriterion: 'planned' });
    expect(await createSettingsStore(storage).load()).toEqual({
      enabledKinds: ['book'],
      heroCriterion: 'planned',
    });
  });

  it.each([
    ['未知の文字列', '{"heroCriterion":"x"}'],
    ['文字列でない', '{"heroCriterion":3}'],
  ])('%s は recent', (_name, raw) => {
    expect(parseSettings(raw).heroCriterion).toBe('recent');
  });

  it('heroCriterion のない古い保存値でも enabledKinds を保つ', () => {
    expect(parseSettings('{"enabledKinds":["movie"]}')).toEqual({
      enabledKinds: ['movie'],
      heroCriterion: 'recent',
    });
  });
});
