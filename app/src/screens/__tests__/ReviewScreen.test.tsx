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

type Handlers = { onAdd?: () => void; onOpenRecord?: (record: MediaRecord) => void };

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
  done('1', { endDate: '2026-10-01', rating: 4, spineColor: 'spine-4', oneLiner: 'よい', quotes: [] }),
  done('2', { endDate: '2026-10-03', rating: 3, spineColor: 'spine-7', starters: [{ id: 's', starter: 'もし', text: 'a', createdAt: '' }] }),
  done('3', { endDate: null }),
];

const bgOf = (id: string) => StyleSheet.flatten(screen.getByTestId(`stack-segment-${id}`).props.style).backgroundColor;

describe('ReviewScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 15));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('見出し・期間・3 つの数字を表示する', async () => {
    await setup(sample);
    expect(await screen.findByText('振り返り')).toBeTruthy();
    expect(screen.getByText('2025/11 – 2026/10')).toBeTruthy();
    expect(screen.getByText('読んだ')).toBeTruthy();
    expect(screen.getByText('2 冊')).toBeTruthy();
    expect(screen.getByText('感想')).toBeTruthy();
    expect(screen.getByText('引用')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('積み上げの段の色・月の数字・今月ラベル・読み上げ・注記を出す', async () => {
    await setup(sample);
    expect(await screen.findByText('月ごとに読んだ本')).toBeTruthy();
    expect(bgOf('1')).toBe(colors.spine4);
    expect(bgOf('2')).toBe(colors.spine7);
    expect(screen.getByLabelText('10月 2 冊')).toBeTruthy();
    expect(screen.getByLabelText('11月 0 冊')).toBeTruthy();
    const color = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;
    expect(color('10月')).toBe(colors.textPrimary);
    expect(color('9月')).toBe(colors.textSecondary);
    expect(screen.getByText('1冊が1段。背表紙の色で積み上がります')).toBeTruthy();
  });

  it('どうだった？に平均・言葉・4 区分を出す', async () => {
    await setup(sample);
    expect(await screen.findByText('どうだった？')).toBeTruthy();
    expect(screen.getByText('平均')).toBeTruthy();
    expect(screen.getByText('3.5')).toBeTruthy();
    // 言葉（平均の横）と区分の見出しの 2 つ
    expect(screen.getAllByText('まあまあ')).toHaveLength(2);
    for (const l of ['最高', 'よかった', 'あんまり']) expect(screen.getByText(l)).toBeTruthy();
  });

  it('評価がなければ平均は「—」で言葉は出ない', async () => {
    await setup([done('1', { endDate: '2026-10-01' })]);
    expect(await screen.findByText('—')).toBeTruthy();
    expect(screen.getAllByText('まあまあ')).toHaveLength(1);
  });

  it('お気に入りがあるときだけ今年のお気に入りを出し、背表紙で詳細を開く', async () => {
    const onOpenRecord = jest.fn();
    await setup(
      [done('f1', { endDate: '2026-02-01', favorite: true, title: '猫' }), ...sample],
      { onOpenRecord },
    );
    expect(await screen.findByText('今年のお気に入り')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^猫、/));
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'f1' }));
  });

  it('onOpenRecord 未指定でも背表紙を押して落ちない', async () => {
    await setup([done('f1', { endDate: '2026-02-01', favorite: true, title: '猫' })]);
    await fireEvent.press(await screen.findByLabelText(/^猫、/));
    expect(screen.getByText('今年のお気に入り')).toBeTruthy();
  });

  it('お気に入りがなければ見出しごと出さない', async () => {
    await setup(sample);
    await screen.findByText('どうだった？');
    expect(screen.queryByText('今年のお気に入り')).toBeNull();
  });

  it('今年いちばん使った書き出しと回数を出す。なければ段ごと出さない', async () => {
    await setup(sample);
    expect(await screen.findByText('今年いちばん使った書き出し')).toBeTruthy();
    expect(screen.getByText('ひとことで言うと、')).toBeTruthy();
    expect(screen.getByText('· 1 回')).toBeTruthy();
  });

  it('書き出しが使われていなければ段を出さない', async () => {
    await setup([done('1', { endDate: '2026-10-01' })]);
    await screen.findByText('どうだった？');
    expect(screen.queryByText('今年いちばん使った書き出し')).toBeNull();
  });

  it('画面のどこにも「評価」「レーティング」が出ない', async () => {
    await setup(sample);
    await screen.findByText('どうだった？');
    expect(screen.queryByText(/評価|レーティング/)).toBeNull();
    expect(screen.queryByLabelText(/評価|レーティング/)).toBeNull();
    expect(screen.queryByText(/終了日が未入力/)).toBeNull();
  });

  it('記録 0 件では空表示になり、数字カードは出ない', async () => {
    await setup([]);
    expect(await screen.findByText('読んだ本がたまると、ここに積み上がります')).toBeTruthy();
    expect(screen.getByText('振り返り')).toBeTruthy();
    expect(screen.queryByText('読んだ')).toBeNull();
    expect(screen.queryByText(/評価|レーティング/)).toBeNull();
  });

  it('空表示の「本を追加する」で追加シートが開き、「手で入力する」で onAdd が呼ばれる', async () => {
    const onAdd = jest.fn();
    await setup([], { onAdd });
    await fireEvent.press(await screen.findByRole('button', { name: '本を追加する' }));
    expect(screen.getByText('本の裏のバーコードを映すだけ')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '手で入力する' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('追加シートの「タイトルで探す」で検索画面へ遷移する', async () => {
    await setup([]);
    await fireEvent.press(await screen.findByRole('button', { name: '本を追加する' }));
    await fireEvent.press(screen.getByRole('button', { name: 'タイトルで探す' }));
    expect(mockPush).toHaveBeenCalledWith('/record/search');
  });

  it('下端にタブバー分の余白がある', async () => {
    await setup(sample, {}, 34);
    await screen.findByText('月ごとに読んだ本');
    const scroll = screen.getByTestId('review-scroll');
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle);
    expect(content.paddingBottom).toBe(space[6] + 34);
  });
});
