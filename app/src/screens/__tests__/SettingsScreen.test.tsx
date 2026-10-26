import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createExportStore, LAST_EXPORTED_AT_KEY } from '../../lib/exportStore';
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
    expect(
      screen.getByRole('radio', { name: '最近読み終えた・見終えた' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
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

describe('SettingsScreen（データ）', () => {
  const dataRow = (value: string) =>
    screen.findByRole('button', { name: `データ、書き出し・読み込み · ${value}` });

  it('未書き出しなら「まだ書き出していません」を出し、タップで onOpenData が呼ばれる', async () => {
    const onOpenData = jest.fn();
    await render(
      withSettings(
        createSettingsStore(createMemoryStorage().storage),
        <SettingsScreen exportStore={createExportStore(createMemoryStorage().storage)} onOpenData={onOpenData} />,
      ),
    );
    await fireEvent.press(await dataRow('まだ書き出していません'));
    expect(onOpenData).toHaveBeenCalledTimes(1);
  });

  it('最後に書き出した日を出す', async () => {
    const { storage } = createMemoryStorage({
      [LAST_EXPORTED_AT_KEY]: new Date(2026, 9, 26, 12).toISOString(),
    });
    await render(
      withSettings(
        createSettingsStore(createMemoryStorage().storage),
        <SettingsScreen exportStore={createExportStore(storage)} />,
      ),
    );
    expect(await dataRow('最後に書き出した日 2026年10月26日')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^データ、/ }));
  });
});


describe('SettingsScreen（ステータスの初期値）', () => {
  it('行の 2 行目に今の値を出し、タップで 4 択のシートが開く', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(await screen.findByText('記録するとき')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'ステータスの初期値、読み終わった・見終わった' }),
    );
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByRole('radio', { name: '読み終わった・見終わった' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('選ぶとすぐ保存されてシートが閉じ、開き直しても保たれる', async () => {
    const { storage } = createMemoryStorage();
    const first = await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: /^ステータスの初期値、/ }));
    await fireEvent.press(screen.getByRole('radio', { name: '読んでる・見てる' }));
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'ステータスの初期値、読んでる・見てる' }),
    ).toBeTruthy();
    await first.unmount();

    await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    expect(
      await screen.findByRole('button', { name: 'ステータスの初期値、読んでる・見てる' }),
    ).toBeTruthy();
  });
});

describe('SettingsScreen（このアプリについて）', () => {
  it('行にバージョンを出し、タップで onOpenAbout が呼ばれる', async () => {
    const onOpenAbout = jest.fn();
    await render(
      withSettings(
        createSettingsStore(createMemoryStorage().storage),
        <SettingsScreen
          exportStore={createExportStore(createMemoryStorage().storage)}
          onOpenAbout={onOpenAbout}
        />,
      ),
    );
    await fireEvent.press(await screen.findByRole('button', { name: /^このアプリについて、/ }));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });
});
