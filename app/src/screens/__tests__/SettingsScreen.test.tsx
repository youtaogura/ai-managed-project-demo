import { fireEvent, render, screen } from '@testing-library/react-native';

import { createExportStore, LAST_EXPORTED_AT_KEY } from '../../lib/exportStore';
import { createSettingsStore } from '../../lib/settingsStore';
import { withSettings } from '../../testProviders';
import { createMemoryStorage } from '../../testUtils';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('SettingsScreen', () => {
  it('見出し・各行を出し、「使う種別」は出さない', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(await screen.findByText('設定')).toBeTruthy();
    expect(screen.getByText('ステータスの初期値')).toBeTruthy();
    expect(screen.queryByText('使う種別')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/映画|ドラマ|アニメ|漫画/)).toBeNull();
  });
});

describe('SettingsScreen（上に大きく出す作品）', () => {
  it('行の 2 行目に今の条件名を出し、タップでシートが開く', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(await screen.findByText('記録一覧')).toBeTruthy();
    const row = screen.getByRole('button', {
      name: '上に大きく出す作品、最近読み終えた',
    });
    await fireEvent.press(row);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(
      screen.getByRole('radio', { name: '最近読み終えた' }).props.accessibilityState,
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
      screen.getByRole('button', { name: 'ステータスの初期値、読み終わった' }),
    );
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByRole('radio', { name: '読み終わった' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('選ぶとすぐ保存されてシートが閉じ、開き直しても保たれる', async () => {
    const { storage } = createMemoryStorage();
    const first = await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: /^ステータスの初期値、/ }));
    await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'ステータスの初期値、読んでる' }),
    ).toBeTruthy();
    await first.unmount();

    await render(withSettings(createSettingsStore(storage), <SettingsScreen />));
    expect(
      await screen.findByRole('button', { name: 'ステータスの初期値、読んでる' }),
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

describe('SettingsScreen（書き出し）', () => {
  it('行に要約を出し、タップで onOpenStarters を呼ぶ', async () => {
    const onOpenStarters = jest.fn();
    await render(
      withSettings(
        createSettingsStore(createMemoryStorage().storage),
        <SettingsScreen onOpenStarters={onOpenStarters} />,
      ),
    );
    await fireEvent.press(await screen.findByRole('button', { name: '書き出し、オン · 一度に 3 つ' }));
    expect(onOpenStarters).toHaveBeenCalledTimes(1);
  });
});
