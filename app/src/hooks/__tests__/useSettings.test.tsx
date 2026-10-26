import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createSettingsStore, type SettingsStore } from '../../lib/settingsStore';
import { createMemoryStorage } from '../../testUtils';
import { DEFAULT_SETTINGS, type AppSettings } from '../../types/settings';
import { SettingsContextProvider, useSettings } from '../useSettings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Latest = { current: ReturnType<typeof useSettings> | null };

// 読み込み完了まで子が描画されないため、描画された子から最新の値を取り出す
async function mount(store: SettingsStore) {
  const latest: Latest = { current: null };
  function Probe() {
    latest.current = useSettings();
    return <Text>{latest.current.settings.enabledKinds.join(',')}</Text>;
  }
  const view = await render(
    <SettingsContextProvider store={store}>
      <Probe />
    </SettingsContextProvider>,
  );
  const get = () => {
    if (latest.current === null) throw new Error('not rendered');
    return latest.current;
  };
  return { get, unmount: view.unmount };
}

describe('useSettings', () => {
  it('Provider が無いと既定の設定が返り、更新は何もしない', async () => {
    const { result } = await renderHook(() => useSettings());
    expect(result.current.settings.enabledKinds).toHaveLength(5);
    await act(async () => result.current.update({ enabledKinds: ['book'] }));
    expect(result.current.settings.enabledKinds).toHaveLength(5);
  });

  it('読み込みが終わるまで子を描画しない', async () => {
    let release: (v: AppSettings) => void = () => undefined;
    const store: SettingsStore = {
      load: () => new Promise((r) => (release = r)),
      save: async () => undefined,
    };
    await render(
      <SettingsContextProvider store={store}>
        <Text>子</Text>
      </SettingsContextProvider>,
    );
    expect(screen.queryByText('子')).toBeNull();
    await act(async () => release({ ...DEFAULT_SETTINGS, enabledKinds: ['movie'] }));
    expect(screen.getByText('子')).toBeTruthy();
  });

  it('読み込みに失敗しても描画が始まる', async () => {
    const store: SettingsStore = {
      load: async () => {
        throw new Error('fail');
      },
      save: async () => undefined,
    };
    const { get } = await mount(store);
    await waitFor(() => expect(get().settings.enabledKinds).toHaveLength(5));
  });

  it('変更が保存され、作り直したストアで読み込むと同じ設定になる', async () => {
    const { storage } = createMemoryStorage();
    const first = await mount(createSettingsStore(storage));
    await waitFor(() => expect(first.get().settings.enabledKinds).toHaveLength(5));
    await act(async () => first.get().update({ enabledKinds: ['manga', 'anime'] }));
    expect(first.get().settings.enabledKinds).toEqual(['manga', 'anime']);
    await first.unmount();

    const second = await mount(createSettingsStore(storage));
    await waitFor(() => expect(second.get().settings.enabledKinds).toEqual(['manga', 'anime']));
  });

  it('項目の変更が保存され、作り直したストアで読み込むと同じ設定になる。種別は変わらない', async () => {
    const { storage } = createMemoryStorage();
    const first = await mount(createSettingsStore(storage));
    await waitFor(() => expect(first.get().settings.enabledKinds).toHaveLength(5));
    await act(async () =>
      first
        .get()
        .update({ enabledFields: { ...first.get().settings.enabledFields, review: false } }),
    );
    await first.unmount();

    const second = await mount(createSettingsStore(storage));
    await waitFor(() => expect(second.get().settings.enabledFields.review).toBe(false));
    expect(second.get().settings.enabledFields.rating).toBe(true);
    expect(second.get().settings.enabledKinds).toHaveLength(5);
  });

  it('保存は直列化され、最後の呼び出しが勝つ。保存に失敗しても状態は保たれる', async () => {
    const saved: string[][] = [];
    let calls = 0;
    const store: SettingsStore = {
      load: async () => ({ ...DEFAULT_SETTINGS, enabledKinds: ['book'] }),
      save: async (s) => {
        calls += 1;
        if (calls === 1) throw new Error('fail');
        saved.push(s.enabledKinds);
      },
    };
    const { get } = await mount(store);
    await waitFor(() => expect(get().settings.enabledKinds).toEqual(['book']));
    await act(async () => {
      get().update({ enabledKinds: ['movie'] });
      get().update({ enabledKinds: ['anime'] });
    });
    await waitFor(() => expect(saved).toEqual([['anime']]));
    expect(get().settings.enabledKinds).toEqual(['anime']);
  });
});
