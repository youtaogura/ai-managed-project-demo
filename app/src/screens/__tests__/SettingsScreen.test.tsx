import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createExportStore, LAST_EXPORTED_AT_KEY } from '../../lib/exportStore';
import type { ReactNode } from 'react';
import { createSettingsStore, type SettingsStore } from '../../lib/settingsStore';
import { createSortOrderStore, SORT_ORDER_STORAGE_KEY } from '../../lib/sortOrderStore';
import { createShelfRepository } from '../../lib/shelfRepository';
import { withSettings as baseWithSettings, withShelfRepository } from '../../testProviders';
import { createMemoryStorage } from '../../testUtils';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const withSettings = (store: SettingsStore, ui: ReactNode) =>
  withShelfRepository(createShelfRepository(createMemoryStorage().storage), baseWithSettings(store, ui));

describe('SettingsScreen', () => {
  it('見出し・カード見出しを出し、古い見出しと「使う種別」は出さない', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    expect(await screen.findByText('設定')).toBeTruthy();
    expect(screen.getByText('読み終えたら')).toBeTruthy();
    expect(screen.getByText('本棚')).toBeTruthy();
    expect(screen.queryByText('記録するとき')).toBeNull();
    expect(screen.queryByText('このアプリ')).toBeNull();
    expect(screen.queryByText('使う種別')).toBeNull();
    expect(screen.queryByText('上に大きく出す作品')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('各行はボタンで、「書き出し」の行はない', async () => {
    await render(
      withSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
    );
    await screen.findByText('設定');
    const names = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    expect(names).toEqual([
      'ステータスの初期値、読み終わった',
      '本棚の管理、まだありません',
      '並び順、終了日の新しい順',
      'データ、書き出し・読み込み · まだ書き出していません',
      'このアプリについて',
    ]);
  });
});

describe('SettingsScreen（並び順）', () => {
  it('今の並び順を出し、シートで選ぶと表示が変わって保存される', async () => {
    const { storage, data } = createMemoryStorage();
    await render(
      withSettings(
        createSettingsStore(createMemoryStorage().storage),
        <SettingsScreen sortOrderStore={createSortOrderStore(storage)} />,
      ),
    );
    await fireEvent.press(await screen.findByRole('button', { name: '並び順、終了日の新しい順' }));
    expect(screen.getByText('並び替え')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '高い順' }));
    expect(screen.queryByText('並び替え')).toBeNull();
    expect(screen.getByRole('button', { name: '並び順、どうだった？の高い順' })).toBeTruthy();
    await waitFor(() => expect(data.get(SORT_ORDER_STORAGE_KEY)).toBe('rating_desc'));
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
    expect(await screen.findByText('読み終えたら')).toBeTruthy();
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
  it('タップで onOpenAbout が呼ばれる', async () => {
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
    await fireEvent.press(await screen.findByRole('button', { name: 'このアプリについて' }));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsScreen（本棚）', () => {
  it('0 件なら「まだありません」、タップで onOpenShelves が呼ばれる', async () => {
    const onOpenShelves = jest.fn();
    await render(
      withSettings(
        createSettingsStore(createMemoryStorage().storage),
        <SettingsScreen onOpenShelves={onOpenShelves} />,
      ),
    );
    await fireEvent.press(await screen.findByRole('button', { name: '本棚の管理、まだありません' }));
    expect(onOpenShelves).toHaveBeenCalledTimes(1);
  });

  it('本棚があれば「N つ」を出す。未指定でも押せる', async () => {
    const shelfRepository = createShelfRepository(createMemoryStorage().storage);
    await shelfRepository.create('SF');
    await shelfRepository.create('哲学');
    await render(
      withShelfRepository(
        shelfRepository,
        baseWithSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
      ),
    );
    await fireEvent.press(await screen.findByRole('button', { name: '本棚の管理、2 つ' }));
  });

  it('読み込みに失敗したら「まだありません」', async () => {
    const shelfRepository = createShelfRepository(createMemoryStorage().storage);
    await render(
      withShelfRepository(
        { ...shelfRepository, getAll: () => Promise.reject(new Error('x')) },
        baseWithSettings(createSettingsStore(createMemoryStorage().storage), <SettingsScreen />),
      ),
    );
    expect(await screen.findByRole('button', { name: '本棚の管理、まだありません' })).toBeTruthy();
  });
});
