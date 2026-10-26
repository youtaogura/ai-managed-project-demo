import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createMemoryStorage } from '../../testUtils';
import { createSortOrderStore } from '../../lib/sortOrderStore';
import { useSortOrder } from '../useSortOrder';

describe('useSortOrder', () => {
  it('既定で始まり、変更が保存されて再マウントで復元される', async () => {
    const { storage } = createMemoryStorage();
    const first = await renderHook(() => useSortOrder(createSortOrderStore(storage)));
    expect(first.result.current[0]).toBe('endDate_desc');
    await act(async () => {
      first.result.current[1]('title_asc');
    });
    expect(first.result.current[0]).toBe('title_asc');
    await first.unmount();

    const second = await renderHook(() => useSortOrder(createSortOrderStore(storage)));
    await waitFor(() => expect(second.result.current[0]).toBe('title_asc'));
  });

  it('保存に失敗しても選択は反映される', async () => {
    const store = {
      load: async () => 'endDate_desc' as const,
      save: async () => {
        throw new Error('fail');
      },
    };
    const { result } = await renderHook(() => useSortOrder(store));
    await act(async () => {
      result.current[1]('rating_asc');
    });
    expect(result.current[0]).toBe('rating_asc');
  });
});
