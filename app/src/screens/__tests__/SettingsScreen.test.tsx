import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createSettingsStore } from '../../lib/settingsStore';
import { withSettings } from '../../testProviders';
import { createMemoryStorage } from '../../testUtils';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const chip = (name: string) => screen.getByRole('checkbox', { name });

describe('SettingsScreen', () => {
  it('見出し・5 つのチップ（すべて選択中）・説明文を出す', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(await screen.findByText('設定')).toBeTruthy();
    expect(screen.getByText('使う種別')).toBeTruthy();
    for (const name of ['本', '漫画', '映画', 'ドラマ', 'アニメ']) {
      expect(chip(name).props.accessibilityState).toMatchObject({ checked: true });
    }
    expect(screen.getByText('最低 1 つは選んでおく必要があります')).toBeTruthy();
  });

  it('タップで切り替わり、保存され、開き直しても保たれる', async () => {
    const { storage } = createMemoryStorage();
    const first = await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    await fireEvent.press(await screen.findByRole('checkbox', { name: '漫画' }));
    expect(chip('漫画').props.accessibilityState).toMatchObject({ checked: false });
    await first.unmount();

    await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    const manga = await screen.findByRole('checkbox', { name: '漫画' });
    expect(manga.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(manga);
    expect(chip('漫画').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('最後の 1 つは外せず、保存もされない', async () => {
    const store = createSettingsStore(createMemoryStorage().storage);
    const save = jest.spyOn(store, 'save');
    await render(withSettings(['movie'], <SettingsScreen />));
    await fireEvent.press(await screen.findByRole('checkbox', { name: '映画' }));
    expect(chip('映画').props.accessibilityState).toMatchObject({ checked: true });
    expect(save).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(chip('本').props.accessibilityState).toMatchObject({ checked: false }),
    );
  });
});
