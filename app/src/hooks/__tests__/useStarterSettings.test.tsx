import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { defaultStarterSettings } from '../../lib/starterDefaults';
import { createStarterSettingsStore, type StarterSettingsStore } from '../../lib/starterSettingsStore';
import { createMemoryStorage } from '../../testUtils';
import { StarterSettingsContextProvider, useStarterSettings } from '../useStarterSettings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Latest = { current: ReturnType<typeof useStarterSettings> | null };

async function mount(store: StarterSettingsStore) {
  const latest: Latest = { current: null };
  function Probe() {
    latest.current = useStarterSettings();
    return <Text>count:{latest.current.starterSettings.count}</Text>;
  }
  await render(
    <StarterSettingsContextProvider store={store}>
      <Probe />
    </StarterSettingsContextProvider>,
  );
  return () => {
    if (latest.current === null) throw new Error('not rendered');
    return latest.current;
  };
}

describe('useStarterSettings', () => {
  it('Provider が無いと既定値で、更新は何もしない', async () => {
    const { result } = await renderHook(() => useStarterSettings());
    expect(result.current.starterSettings).toEqual(defaultStarterSettings());
    await act(async () => result.current.update({ count: 5 }));
    await act(async () => result.current.replace(defaultStarterSettings()));
    expect(result.current.starterSettings.count).toBe(3);
  });

  it('読み込み後に描画し、update は保存される', async () => {
    const { storage } = createMemoryStorage();
    const store = createStarterSettingsStore(storage);
    await store.save({ ...defaultStarterSettings(), count: 2 });
    const get = await mount(store);
    expect(await screen.findByText('count:2')).toBeTruthy();
    await act(async () => get().update({ count: 5 }));
    expect(screen.getByText('count:5')).toBeTruthy();
    await waitFor(async () => expect((await store.load()).count).toBe(5));
  });

  it('replace は状態だけ置き換える', async () => {
    const store = createStarterSettingsStore(createMemoryStorage().storage);
    const get = await mount(store);
    await screen.findByText('count:3');
    await act(async () => get().replace({ ...defaultStarterSettings(), count: 2 }));
    expect(screen.getByText('count:2')).toBeTruthy();
  });

  it('読み込みに失敗しても既定値で描画する', async () => {
    const store: StarterSettingsStore = {
      load: () => Promise.reject(new Error('x')),
      save: async () => undefined,
    };
    await mount(store);
    expect(await screen.findByText('count:3')).toBeTruthy();
  });
});
