import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createSettingsStore, type SettingsStore } from '../../lib/settingsStore';
import { createMemoryStorage } from '../../testUtils';
import { SettingsContextProvider, useSettings } from '../useSettings';
import type { AppSettings } from '../../types/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Latest = { current: ReturnType<typeof useSettings> | null };

// 読み込み完了まで子が描画されないため、描画された子から最新の値を取り出す
async function mount(store: SettingsStore) {
  const latest: Latest = { current: null };
  function Probe() {
    latest.current = useSettings();
    return <Text>{latest.current.settings.heroCriterion}</Text>;
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
    expect(result.current.settings.heroCriterion).toBe('recent');
    await act(async () => result.current.update({ heroCriterion: 'none' }));
    expect(result.current.settings.heroCriterion).toBe('recent');
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
    await act(async () =>
      release({ heroCriterion: 'recent', defaultStatus: 'completed' }),
    );
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
    await waitFor(() => expect(get().settings.heroCriterion).toBe('recent'));
  });

  it('変更が保存され、作り直したストアで読み込むと同じ設定になる', async () => {
    const { storage } = createMemoryStorage();
    const first = await mount(createSettingsStore(storage));
    await waitFor(() => expect(first.get().settings.heroCriterion).toBe('recent'));
    await act(async () => first.get().update({ heroCriterion: 'planned' }));
    expect(first.get().settings.heroCriterion).toBe('planned');
    await first.unmount();

    const second = await mount(createSettingsStore(storage));
    await waitFor(() => expect(second.get().settings.heroCriterion).toBe('planned'));
  });

  it('保存は直列化され、最後の呼び出しが勝つ。保存に失敗しても状態は保たれる', async () => {
    const saved: string[] = [];
    let calls = 0;
    const store: SettingsStore = {
      load: async () => ({ heroCriterion: 'recent', defaultStatus: 'completed' }),
      save: async (s) => {
        calls += 1;
        if (calls === 1) throw new Error('fail');
        saved.push(s.heroCriterion);
      },
    };
    const { get } = await mount(store);
    await waitFor(() => expect(get().settings.heroCriterion).toBe('recent'));
    await act(async () => {
      get().update({ heroCriterion: 'planned' });
      get().update({ heroCriterion: 'inProgress' });
    });
    await waitFor(() => expect(saved).toEqual(['inProgress']));
    expect(get().settings.heroCriterion).toBe('inProgress');
  });

  it('replace で設定全体が置き換わる（保存は呼び出し側）', async () => {
    const save = jest.fn(async () => undefined);
    const store: SettingsStore = {
      load: async () => ({ heroCriterion: 'recent', defaultStatus: 'completed' }),
      save,
    };
    const { get } = await mount(store);
    await waitFor(() => expect(get().settings.heroCriterion).toBe('recent'));
    await act(async () => get().replace({ heroCriterion: 'none', defaultStatus: 'completed' }));
    expect(get().settings).toEqual({ heroCriterion: 'none', defaultStatus: 'completed' });
    expect(save).not.toHaveBeenCalled();
  });
});
