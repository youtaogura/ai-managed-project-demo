import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { triggerRatingHaptic } from '../../lib/haptics';
import { createRecordRepository, RECORDS_STORAGE_KEY, type RecordRepository } from '../../lib/recordRepository';
import { withRepository } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { FinishedScreen } from '../FinishedScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../lib/haptics', () => ({ triggerImpactHaptic: jest.fn(), triggerRatingHaptic: jest.fn() }));

jest.setTimeout(15000);

const SAVE_ERROR = '保存できませんでした。もう一度お試しください';

const base = makeRecord({
  id: 'x',
  title: '吾輩は猫である',
  status: 'completed',
  startDate: '2024-10-18',
  endDate: '2024-10-26',
  memos: [1, 2, 3, 4].map((i) => ({ id: `m${i}`, text: 'm', page: null, createdAt: '2024-01-01T00:00:00.000Z' })),
});

type Handlers = { onWrite?: jest.Mock; onLater?: jest.Mock; onBack?: jest.Mock };

async function show(
  records: MediaRecord[] = [base],
  handlers: Handlers = {},
  wrap?: (repository: RecordRepository) => RecordRepository,
) {
  const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: JSON.stringify(records) });
  const real = createRecordRepository(storage);
  const repository = wrap ? wrap(real) : real;
  await renderRouter({
    index: () => withRepository(repository, <FinishedScreen recordId="x" {...handlers} />),
  });
  await waitFor(() => expect(screen.getByText('どうだった？')).toBeTruthy());
  return real;
}

const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');
const slider = () => screen.getByLabelText('どうだった？');
const act1 = (actionName: string) =>
  act(async () => {
    await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName } });
  });
const layout = () =>
  act(async () => {
    await fireEvent(slider(), 'layout', { nativeEvent: { layout: { width: 100 } } });
  });
const tapAt = (x: number) =>
  act(async () => {
    await fireEvent(slider(), 'responderGrant', { nativeEvent: { locationX: x, pageX: x } });
  });

beforeEach(() => jest.clearAllMocks());

describe('FinishedScreen の表示', () => {
  it('背表紙・読み終えた・タイトル・要約・目安・案内文を出す', async () => {
    await show();
    expect(screen.getByLabelText(/^吾輩は猫である、/)).toBeTruthy();
    expect(screen.getByText('読み終えた')).toBeTruthy();
    expect(screen.getByText('吾輩は猫である', { exact: true })).toBeTruthy();
    expect(screen.getByText('10/18 – 10/26 · 9 日間 · メモ 4 件')).toBeTruthy();
    expect(screen.getByText(/最高 5.0.*よかった 4.0〜4.9.*まあまあ 3.0〜3.9.*あんまり 〜2.9/)).toBeTruthy();
    expect(screen.getByText('星をなぞると 0.1 ずつ変わります')).toBeTruthy();
    expect(screen.getByRole('button', { name: '記録を書く' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'あとで書く' })).toBeTruthy();
  });

  it('評価がなければ数字と言葉を出さない', async () => {
    await show();
    expect(screen.queryByText('最高', { exact: true })).toBeNull();
    expect(screen.queryByText(/^\d\.\d$/)).toBeNull();
  });

  it('既存の評価を初期値にして数字と言葉を出す', async () => {
    await show([{ ...base, rating: 4.5 }]);
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('よかった')).toBeTruthy();
  });

  it('「評価」「問い」「お題」を出さない', async () => {
    await show([{ ...base, rating: 3 }]);
    expect(screen.queryByText(/評価|問い|お題/)).toBeNull();
    expect(screen.queryByLabelText(/評価|問い|お題/)).toBeNull();
  });
});

describe('評価の保存', () => {
  it('言葉が境界ちょうどで切り替わり、変更のたびに保存する', async () => {
    const repository = await show([{ ...base, rating: 4.9 }]);
    expect(screen.getByText('よかった')).toBeTruthy();
    await act1('increment');
    expect(screen.getByText('5.0')).toBeTruthy();
    expect(screen.getByText('最高', { exact: true })).toBeTruthy();
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
    await waitFor(async () => expect((await stored(repository))?.rating).toBe(5));
    await layout();
    await tapAt(60);
    expect(screen.getByText('3.0')).toBeTruthy();
    expect(screen.getByText('まあまあ')).toBeTruthy();
    await tapAt(58);
    expect(screen.getByText('2.9')).toBeTruthy();
    expect(screen.getByText('あんまり', { exact: true })).toBeTruthy();
    await waitFor(async () => expect((await stored(repository))?.rating).toBe(2.9));
  });

  it('未選択からタップで選び、保存は直列で最後の値が残る', async () => {
    const repository = await show();
    await layout();
    await act(async () => {
      for (const x of [60, 70, 80, 90]) {
        await fireEvent(slider(), 'responderGrant', { nativeEvent: { locationX: x, pageX: x } });
      }
    });
    await waitFor(async () => expect((await stored(repository))?.rating).toBe(4.5));
    expect((await stored(repository))?.memos).toHaveLength(4);
  });

  it('保存に失敗したらエラーを出し、画面は落ちない', async () => {
    await show([base], {}, (repo) => ({ ...repo, update: async () => Promise.reject(new Error('x')) }));
    await act1('increment');
    await waitFor(() => expect(screen.getByText(SAVE_ERROR)).toBeTruthy());
    expect(screen.getByText('3.0')).toBeTruthy();
  });
});

describe('お気に入り', () => {
  it('初期値は record.favorite。切り替えると favorite を保存する', async () => {
    const repository = await show([{ ...base, favorite: true }]);
    const toggle = screen.getByRole('switch', { name: 'お気に入りにする' });
    expect(toggle.props.accessibilityState.checked).toBe(true);
    await fireEvent.press(toggle);
    await waitFor(async () => expect((await stored(repository))?.favorite).toBe(false));
    await fireEvent.press(screen.getByRole('switch', { name: 'お気に入りにする' }));
    await waitFor(async () => expect((await stored(repository))?.favorite).toBe(true));
  });

  it('保存に失敗したら元の値に戻してエラーを出す', async () => {
    await show([base], {}, (repo) => ({ ...repo, update: async () => Promise.reject(new Error('x')) }));
    await fireEvent.press(screen.getByRole('switch', { name: 'お気に入りにする' }));
    await waitFor(() => expect(screen.getByText(SAVE_ERROR)).toBeTruthy());
    expect(screen.getByRole('switch', { name: 'お気に入りにする' }).props.accessibilityState.checked).toBe(false);
  });
});

describe('ボタンと見つからないとき', () => {
  it('「記録を書く」で onWrite、「あとで書く」で onLater', async () => {
    const onWrite = jest.fn();
    const onLater = jest.fn();
    await show([base], { onWrite, onLater });
    await fireEvent.press(screen.getByRole('button', { name: '記録を書く' }));
    expect(onWrite).toHaveBeenCalledWith('x');
    await fireEvent.press(screen.getByRole('button', { name: 'あとで書く' }));
    expect(onLater).toHaveBeenCalled();
  });

  it('記録がなければ「本が見つかりません」と戻る手段を出す', async () => {
    const onBack = jest.fn();
    const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: '[]' });
    await renderRouter({
      index: () => withRepository(createRecordRepository(storage), <FinishedScreen recordId="x" onBack={onBack} />),
    });
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '本棚へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('読み込みに失敗しても落ちない', async () => {
    const { storage } = createMemoryStorage();
    const repository = { ...createRecordRepository(storage), getAll: async () => Promise.reject(new Error('x')) };
    await renderRouter({ index: () => withRepository(repository, <FinishedScreen recordId="x" />) });
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
  });
});
