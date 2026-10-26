import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { colors, space } from '../../design/tokens';
import { withRepository } from '../../testProviders';
import { createFakeRepository, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { ReviewScreen } from '../ReviewScreen';

const mockPush = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
    router: { push: (...args: unknown[]) => mockPush(...args) },
  };
});

type Handlers = { onAdd?: () => void; onOpenRecords?: () => void };

async function setup(records: MediaRecord[], handlers: Handlers = {}, bottom = 0) {
  await render(
    <SafeAreaInsetsContext.Provider value={{ top: 0, bottom, left: 0, right: 0 }}>
      {withRepository(createFakeRepository(records).repository, <ReviewScreen {...handlers} />)}
    </SafeAreaInsetsContext.Provider>,
  );
}

const done = (id: string, extra: Partial<MediaRecord>) =>
  makeRecord({ id, status: 'completed', ...extra });

const sample = [
  done('1', { endDate: '2026-10-01', rating: 4 }),
  done('2', { endDate: '2026-10-03', rating: 3 }),
  done('3', { endDate: null }),
];

describe('ReviewScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 15));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('見出し・対象期間・2 つの数字を表示する', async () => {
    await setup(sample);
    expect(await screen.findByText('振り返り')).toBeTruthy();
    expect(screen.getByText('2025/11 – 2026/10')).toBeTruthy();
    expect(screen.getByText('この1年で終えた')).toBeTruthy();
    expect(screen.getByText('作品')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('平均レーティング')).toBeTruthy();
    expect(screen.getByText('3.5')).toBeTruthy();
  });

  it('評価がなければ平均は「—」で、完了 0 件でも空表示にならない', async () => {
    await setup([makeRecord()]);
    expect(await screen.findByText('平均レーティング')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('月別の完了数')).toBeTruthy();
    expect(screen.queryByText(/終了日が未入力/)).toBeNull();
    expect(screen.queryByText('入力する')).toBeNull();
  });

  it('月別の棒・月ラベル・読み上げを表示し、凡例（種別名）は出さない', async () => {
    await setup(sample);
    expect(await screen.findByText('月別の完了数')).toBeTruthy();
    expect(screen.getByLabelText('10月 2 作品')).toBeTruthy();
    expect(screen.getByLabelText('11月 0 作品')).toBeTruthy();
    const color = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;
    expect(color('10月')).toBe(colors.textPrimary);
    expect(color('9月')).toBe(colors.textSecondary);
    for (const kind of ['本', '漫画', '映画', 'ドラマ', 'アニメ']) {
      expect(screen.queryByText(kind)).toBeNull();
    }
  });

  it('終了日が未入力の完了記録があれば案内を出し、「入力する」で一覧へ移る', async () => {
    const onOpenRecords = jest.fn();
    await setup(sample, { onOpenRecords });
    expect(await screen.findByText('終了日が未入力の記録: 1 件')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '入力する' }));
    expect(onOpenRecords).toHaveBeenCalledTimes(1);
  });

  it('onOpenRecords 未指定でも「入力する」で落ちない', async () => {
    await setup(sample);
    await fireEvent.press(await screen.findByRole('button', { name: '入力する' }));
    expect(screen.getByText('月別の完了数')).toBeTruthy();
  });

  it('レーティングの分布を表示し、種別ごとの平均は出さない', async () => {
    await setup(sample);
    expect(await screen.findByText('レーティング')).toBeTruthy();
    expect(screen.getByText('4点台')).toBeTruthy();
    expect(screen.queryByText('種別ごとの平均')).toBeNull();
    expect(screen.queryByText('映画')).toBeNull();
  });

  it('記録 0 件では空表示になり、数字カードは出ない', async () => {
    await setup([]);
    expect(await screen.findByText('記録がたまると、ここに振り返りが表示されます')).toBeTruthy();
    expect(screen.getByText('振り返り')).toBeTruthy();
    expect(screen.queryByText('この1年で終えた')).toBeNull();
    expect(screen.queryByText('月別の完了数')).toBeNull();
  });

  it('空表示の「記録する」で追加シートが開き、「手で入力する」で onAdd が呼ばれる', async () => {
    const onAdd = jest.fn();
    await setup([], { onAdd });
    await fireEvent.press(await screen.findByRole('button', { name: '記録する' }));
    expect(screen.getByText('何を記録しますか')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '本を手で入力する' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('追加シートの「タイトルで探す」で検索画面へ遷移する', async () => {
    await setup([]);
    await fireEvent.press(await screen.findByRole('button', { name: '記録する' }));
    await fireEvent.press(screen.getByRole('button', { name: '本をタイトルで探す' }));
    expect(mockPush).toHaveBeenCalledWith('/record/search');
  });

  it('下端にタブバー分の余白がある', async () => {
    await setup(sample, {}, 34);
    await screen.findByText('月別の完了数');
    const scroll = screen.getByTestId('review-scroll');
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle);
    expect(content.paddingBottom).toBe(space[6] + 34);
  });
});
