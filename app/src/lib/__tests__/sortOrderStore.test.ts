import { createSortOrderStore, SORT_ORDER_STORAGE_KEY } from '../sortOrderStore';
import type { KeyValueStorage } from '../storage';
import { createMemoryStorage } from '../../testUtils';

describe('sortOrderStore', () => {
  it('保存した並び順を別インスタンスで読み直せる', async () => {
    const { storage } = createMemoryStorage();
    await createSortOrderStore(storage).save('rating_desc');
    expect(await createSortOrderStore(storage).load()).toBe('rating_desc');
  });

  it('未保存・壊れた値・未知の値は既定に戻る', async () => {
    expect(await createSortOrderStore(createMemoryStorage().storage).load()).toBe('endDate_desc');
    const broken = createMemoryStorage({ [SORT_ORDER_STORAGE_KEY]: 'unknown' });
    expect(await createSortOrderStore(broken.storage).load()).toBe('endDate_desc');
  });

  it('読み出し失敗でも既定に戻り、例外を出さない', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('fail');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    expect(await createSortOrderStore(storage).load()).toBe('endDate_desc');
  });
});
