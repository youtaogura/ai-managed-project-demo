import { createMemoryStorage } from '../../testUtils';
import { defaultStarterSettings } from '../starterDefaults';
import {
  createStarterSettingsStore,
  parseStarterSettings,
  STARTER_SETTINGS_STORAGE_KEY,
} from '../starterSettingsStore';

describe('starterSettingsStore', () => {
  it('保存して load すると同じ値', async () => {
    const { storage } = createMemoryStorage();
    const settings = {
      enabled: false,
      count: 5 as const,
      items: [
        { id: 'a', text: '自分の書き出し、', enabled: true, custom: true },
        { id: 'b', text: 'もう一つ、', enabled: false, custom: false },
      ],
    };
    await createStarterSettingsStore(storage).save(settings);
    expect(await createStarterSettingsStore(storage).load()).toEqual(settings);
  });

  it('未保存・壊れた JSON は既定値', async () => {
    expect(await createStarterSettingsStore(createMemoryStorage().storage).load()).toEqual(defaultStarterSettings());
    const broken = createMemoryStorage({ [STARTER_SETTINGS_STORAGE_KEY]: '{' });
    expect(await createStarterSettingsStore(broken.storage).load()).toEqual(defaultStarterSettings());
  });

  it('読み込みに失敗しても既定値', async () => {
    const storage = createMemoryStorage().storage;
    storage.getItem = async () => {
      throw new Error('fail');
    };
    expect(await createStarterSettingsStore(storage).load()).toEqual(defaultStarterSettings());
  });

  it('count が 2/3/5 以外は 3、enabled が真偽値でなければ true', () => {
    expect(parseStarterSettings({ count: 4, enabled: 'no' })).toMatchObject({
      count: 3,
      enabled: true,
    });
    expect(parseStarterSettings({ count: 2 }).count).toBe(2);
  });

  it('不正な items 要素と重複 ID は捨てる', () => {
    const parsed = parseStarterSettings({
      items: [
        { id: 'a', text: 'ok、', enabled: true, custom: false },
        { id: 'a', text: 'dup、', enabled: true, custom: false },
        { id: '', text: 'x', enabled: true, custom: false },
        { id: 'b', text: ' ', enabled: true, custom: false },
        { id: 'c', text: 'x', enabled: 1, custom: false },
        null,
      ],
    });
    expect(parsed.items).toEqual([{ id: 'a', text: 'ok、', enabled: true, custom: false }]);
  });

  it('items が配列でなければ既定の項目、オブジェクトでなければ既定値', () => {
    expect(parseStarterSettings({ items: 'x' }).items).toEqual(defaultStarterSettings().items);
    expect(parseStarterSettings(null)).toEqual(defaultStarterSettings());
  });
});
