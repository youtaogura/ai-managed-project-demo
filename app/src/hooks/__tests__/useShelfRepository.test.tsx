import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createShelfRepository } from '../../lib/shelfRepository';
import { createMemoryStorage } from '../../testUtils';
import { ShelfRepositoryProvider, useShelfRepository } from '../useShelfRepository';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useShelfRepository', () => {
  it('Provider が無いとエラー', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useShelfRepository())).rejects.toThrow('ShelfRepositoryProvider');
  });

  it('注入した repository を返す', async () => {
    const repository = createShelfRepository(createMemoryStorage().storage);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShelfRepositoryProvider repository={repository}>{children}</ShelfRepositoryProvider>
    );
    const { result } = await renderHook(() => useShelfRepository(), {
      wrapper,
    });
    expect(result.current).toBe(repository);
  });

  it('省略時は既定の repository を作る', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShelfRepositoryProvider>{children}</ShelfRepositoryProvider>
    );
    const { result } = await renderHook(() => useShelfRepository(), {
      wrapper,
    });
    expect(await result.current.getAll()).toEqual([]);
  });
});
