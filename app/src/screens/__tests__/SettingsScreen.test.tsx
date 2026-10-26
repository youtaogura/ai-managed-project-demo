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

describe('SettingsScreen（記録する項目）', () => {
  const FIELD_NAMES = ['レーティング', 'ステータス', '始めた日', '終えた日', '感想', '写真'];
  const sw = (name: string) => screen.getByRole('switch', { name });

  it('6 つのスイッチがこの順に、すべてオンで出る。タイトルなどは出ない', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    await screen.findByText('記録する項目');
    const switches = screen.getAllByRole('switch');
    expect(switches.map((s) => s.props.accessibilityLabel)).toEqual(FIELD_NAMES);
    for (const name of FIELD_NAMES) {
      expect(sw(name).props.accessibilityState).toMatchObject({ checked: true });
    }
    expect(screen.queryByRole('switch', { name: 'タイトル' })).toBeNull();
  });

  it('補足と、カード下の説明を出す', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(
      await screen.findByText(/読み始めた日」、映画・ドラマ・アニメは「見始めた日/),
    ).toBeTruthy();
    expect(screen.getByText(/読み終えた日」、映画・ドラマ・アニメは「見終えた日/)).toBeTruthy();
    expect(screen.getByText('書影の自動取得はオフになりません')).toBeTruthy();
    expect(
      screen.getByText(
        'オフにした項目は、入力欄にも表示にも出なくなります。入力済みの内容は消えません。',
      ),
    ).toBeTruthy();
  });

  it('タップで切り替わり、保存され、開き直しても保たれる。種別は変わらない', async () => {
    const { storage } = createMemoryStorage();
    const first = await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    await fireEvent.press(await screen.findByRole('switch', { name: '感想' }));
    expect(sw('感想').props.accessibilityState).toMatchObject({ checked: false });
    expect(sw('レーティング').props.accessibilityState).toMatchObject({ checked: true });
    await first.unmount();

    await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    const review = await screen.findByRole('switch', { name: '感想' });
    expect(review.props.accessibilityState).toMatchObject({ checked: false });
    expect(chip('本').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(review);
    expect(sw('感想').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('6 項目すべてオフにできる', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    await screen.findByText('記録する項目');
    for (const name of FIELD_NAMES) await fireEvent.press(sw(name));
    for (const name of FIELD_NAMES) {
      expect(sw(name).props.accessibilityState).toMatchObject({ checked: false });
    }
  });
});

describe('SettingsScreen（上に大きく出す作品）', () => {
  it('行の 2 行目に今の条件名を出し、タップでシートが開く', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(await screen.findByText('記録一覧')).toBeTruthy();
    const row = screen.getByRole('button', {
      name: '上に大きく出す作品、最近読み終えた・見終えた',
    });
    await fireEvent.press(row);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: '最近読み終えた・見終えた' }).props.accessibilityState)
      .toMatchObject({ selected: true });
  });

  it('選ぶとすぐ保存されてシートが閉じ、開き直しても保たれる', async () => {
    const { storage } = createMemoryStorage();
    const first = await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: /^上に大きく出す作品、/ }));
    await fireEvent.press(screen.getByRole('radio', { name: '表示しない' }));
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByRole('button', { name: '上に大きく出す作品、表示しない' })).toBeTruthy();
    await first.unmount();

    await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    expect(
      await screen.findByRole('button', { name: '上に大きく出す作品、表示しない' }),
    ).toBeTruthy();
  });
});
