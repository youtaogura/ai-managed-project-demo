import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { MediaSearchContextProvider } from '../useMediaSearch';
import type { MediaSearchProvider } from '../../lib/mediaSearch/MediaSearchProvider';
import { withSettings } from '../../testProviders';
import type { MediaKind } from '../../types/record';
import { useAddSheet } from '../useAddSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const provider: MediaSearchProvider = {
  attribution: 'x',
  search: async () => ({ status: 'ok', candidates: [] }),
};

async function setup(
  kinds: MediaKind[],
  mediaProvider: MediaSearchProvider | null,
  onAdd?: () => void,
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return withSettings(
      kinds,
      <MediaSearchContextProvider provider={mediaProvider}>{children}</MediaSearchContextProvider>,
    );
  }
  const hook = await renderHook(() => useAddSheet(onAdd), { wrapper: Wrapper });
  await waitFor(() => expect(hook.result.current).not.toBeNull());
  return hook;
}

beforeEach(() => jest.clearAllMocks());

describe('useAddSheet', () => {
  it('入口が 2 つ以上あればシートを開く', async () => {
    const { result } = await setup(['book', 'movie'], null);
    await act(async () => result.current.openAdd());
    expect(result.current.addOpen).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('入口が「映画等を手で入力する」だけなら、シートを開かず先頭の種別でフォームを開く', async () => {
    const { result } = await setup(['anime', 'drama'], null);
    await act(async () => result.current.openAdd());
    expect(result.current.addOpen).toBe(false);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'drama' },
    });
  });

  it('TMDb キーがあれば映画等だけでもシートを開く', async () => {
    const { result } = await setup(['movie'], provider);
    await act(async () => result.current.openAdd());
    expect(result.current.addOpen).toBe(true);
    expect(result.current.enabledKinds).toEqual(['movie']);
  });

  it('本・漫画の手入力は onAdd、各入口は対応する画面へ', async () => {
    const onAdd = jest.fn();
    const { result } = await setup(['book', 'movie'], provider, onAdd);
    await act(async () => result.current.select('manual'));
    expect(onAdd).toHaveBeenCalled();
    await act(async () => result.current.select('scan'));
    expect(router.push).toHaveBeenCalledWith('/record/scan');
    await act(async () => result.current.select('mediaManual'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'movie' },
    });
  });
});
