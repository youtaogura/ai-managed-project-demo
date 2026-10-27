import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { createNoteDraftStore } from '../../lib/noteDraftStore';
import { createRecordRepository, RECORDS_STORAGE_KEY, type RecordRepository } from '../../lib/recordRepository';
import { todayString } from '../../lib/recordForm';
import { createShelfRepository, SHELVES_STORAGE_KEY } from '../../lib/shelfRepository';
import { withNoteDraftStore, withRepository } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { triggerImpactHaptic } from '../../lib/haptics';
import { ReadingScreen } from '../ReadingScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../lib/haptics', () => ({
  triggerImpactHaptic: jest.fn(),
  triggerRatingHaptic: jest.fn(),
}));

jest.setTimeout(15000);

const SHELVES = [
  { id: 's1', name: 'SF', order: 0 },
  { id: 's2', name: '哲学', order: 1 },
];

const base = makeRecord({
  id: 'x',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  status: 'in_progress',
  startDate: '2024-10-18',
  shelfIds: ['s1', 's2'],
  memos: [{ id: 'm1', text: '猫の視点', page: '88', createdAt: '2024-01-01T00:00:00.000Z' }],
  quotes: [
    { id: 'q1', text: '名前はまだ無い', page: '12', comment: 'ここが好き', createdAt: '2024-01-02T00:00:00.000Z' },
  ],
});

type Handlers = { onEdit?: jest.Mock; onFinished?: jest.Mock; onBack?: jest.Mock };

async function show(
  records: MediaRecord[] = [base],
  handlers: Handlers = {},
  wrap?: (repository: RecordRepository) => RecordRepository,
) {
  const { storage, data } = createMemoryStorage({
    [RECORDS_STORAGE_KEY]: JSON.stringify(records),
    [SHELVES_STORAGE_KEY]: JSON.stringify(SHELVES),
  });
  const real = createRecordRepository(storage);
  const repository = wrap ? wrap(real) : real;
  const drafts = createMemoryStorage();
  await renderRouter({
    index: () =>
      withNoteDraftStore(
        createNoteDraftStore(drafts.storage),
        withRepository(
          repository,
          <ReadingScreen recordId="x" {...handlers} />,
          undefined,
          undefined,
          createShelfRepository(storage),
        ),
      ),
  });
  return { repository: real, data, drafts };
}

const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');

describe('ReadingScreen の表示', () => {
  it('背表紙・開始日・タイトル・作者 · 本棚・件数を出す', async () => {
    await show();
    await waitFor(() => expect(screen.getByText('読んでる · 10/18 から')).toBeTruthy());
    expect(screen.getByText('吾輩は猫である', { exact: true })).toBeTruthy();
    expect(screen.getByLabelText(/^吾輩は猫である、/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('夏目漱石 · SF、哲学')).toBeTruthy());
    expect(screen.getByText('メモと引用')).toBeTruthy();
    expect(screen.getByText('2 件')).toBeTruthy();
    expect(screen.getByRole('button', { name: '編集' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '読み終えた' })).toBeTruthy();
  });

  it('背表紙は1冊だけ、題名・開始日・作者を並べて出し、棚板は出さない', async () => {
    await show();
    await waitFor(() => expect(screen.getByText('夏目漱石 · SF、哲学')).toBeTruthy());
    expect(screen.getAllByLabelText(/^吾輩は猫である、/)).toHaveLength(1);
    expect(screen.getByText('読んでる · 10/18 から')).toBeTruthy();
    expect(screen.getByText('吾輩は猫である', { exact: true })).toBeTruthy();
    expect(screen.queryByTestId('shelf-board')).toBeNull();
  });

  it('メモは MemoRow、引用は線付きで、ページ順に並ぶ', async () => {
    await show();
    await waitFor(() => expect(screen.getByText('猫の視点')).toBeTruthy());
    expect(screen.getAllByTestId('quote-line')).toHaveLength(1);
    expect(screen.getByText('p.88')).toBeTruthy();
    expect(screen.getByText('p.12')).toBeTruthy();
    expect(screen.getByText('ここが好き')).toBeTruthy();
    const labels = screen
      .getAllByRole('button', { name: /^(メモ|引用) / })
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels).toEqual(['引用 名前はまだ無い', 'メモ 猫の視点']);
  });

  it('開始日・作者・本棚が無いときは出し分ける', async () => {
    await show([{ ...base, startDate: null, creator: null, shelfIds: [], memos: [], quotes: [] }]);
    await waitFor(() => expect(screen.getByText('読んでる')).toBeTruthy());
    expect(screen.queryByText(/ · /)).toBeNull();
    expect(screen.getByText('0 件')).toBeTruthy();
    expect(screen.getByText('まだ何もありません。気づいたことを、ひとこと残してみませんか')).toBeTruthy();
  });

  it('作者だけ・本棚だけの行を出す', async () => {
    await show([{ ...base, shelfIds: [] }]);
    await waitFor(() => expect(screen.getByText('夏目漱石')).toBeTruthy());
  });

  it('本棚だけのとき', async () => {
    await show([{ ...base, creator: null }]);
    await waitFor(() => expect(screen.getByText('SF、哲学')).toBeTruthy());
  });

  it('読んでる以外でも表示するが「読み終えた」は出さない', async () => {
    await show([{ ...base, status: 'completed' }]);
    await waitFor(() => expect(screen.getByText('メモと引用')).toBeTruthy());
    expect(screen.queryByRole('button', { name: '読み終えた' })).toBeNull();
  });

  it('記録が無いときは「本が見つかりません」と戻る手段を出す', async () => {
    const onBack = jest.fn();
    await show([], { onBack });
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '本棚へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('読み込みに失敗しても落ちない', async () => {
    await show([base], {}, (repo) => ({ ...repo, getAll: async () => Promise.reject(new Error('x')) }));
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
  });

  it('戻る・編集のコールバックを呼ぶ', async () => {
    const onBack = jest.fn();
    const onEdit = jest.fn();
    await show([base], { onBack, onEdit });
    await waitFor(() => expect(screen.getByRole('button', { name: '編集' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    await fireEvent.press(screen.getByRole('button', { name: '編集' }));
    expect(onBack).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledWith('x');
  });
});

describe('メモ・引用の追加・編集・削除', () => {
  const open = async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: 'メモ・引用を書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'メモ・引用を書く' }));
    await waitFor(() => expect(screen.getByLabelText('本文')).toBeTruthy());
  };

  it('追加するとページ順に即反映され、ほかの項目は変わらない', async () => {
    const { repository } = await show();
    await open();
    await fireEvent.changeText(screen.getByLabelText('ページ'), '50');
    await fireEvent.changeText(screen.getByLabelText('本文'), '途中のメモ');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    await waitFor(() => expect(screen.getByText('3 件')).toBeTruthy());
    const labels = screen
      .getAllByRole('button', { name: /^(メモ|引用) / })
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels).toEqual(['引用 名前はまだ無い', 'メモ 途中のメモ', 'メモ 猫の視点']);
    const saved = await stored(repository);
    expect(saved?.memos).toHaveLength(2);
    expect(saved).toMatchObject({ title: '吾輩は猫である', status: 'in_progress', shelfIds: ['s1', 's2'] });
  });

  it('書きかけで閉じると下書きに残り、開き直すと復元される', async () => {
    const { drafts } = await show();
    await open();
    await fireEvent.changeText(screen.getByLabelText('本文'), '書きかけ');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(drafts.data.get('noteDraft.v1.x')).toContain('書きかけ'));
    await open();
    await waitFor(() => expect(screen.getByLabelText('本文').props.value).toBe('書きかけ'));
  });

  it('保存に失敗したらシートにエラーを出す', async () => {
    await show([base], {}, (repo) => ({ ...repo, update: async () => Promise.reject(new Error('x')) }));
    await open();
    await fireEvent.changeText(screen.getByLabelText('本文'), 'a');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    expect(screen.getByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
  });

  it('記録が消えていて保存できないときもエラーにする', async () => {
    await show([base], {}, (repo) => ({ ...repo, update: async () => null }));
    await open();
    await fireEvent.changeText(screen.getByLabelText('本文'), 'a');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    expect(screen.getByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
  });

  it('タップで編集モードが開き、種類を切り替えて保存すると並びも更新される', async () => {
    const { repository } = await show();
    await waitFor(() => expect(screen.getByLabelText('メモ 猫の視点')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('メモ 猫の視点'));
    expect(screen.getByText('メモを直す')).toBeTruthy();
    expect(screen.getByLabelText('本文').props.value).toBe('猫の視点');
    await fireEvent.changeText(screen.getByLabelText('ページ'), '3');
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    await waitFor(() => expect(screen.getByLabelText('引用 猫の視点')).toBeTruthy());
    const saved = await stored(repository);
    expect(saved?.memos).toEqual([]);
    expect(saved?.quotes.map((q) => q.id)).toEqual(['q1', 'm1']);
    const labels = screen
      .getAllByRole('button', { name: /^(メモ|引用) / })
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels).toEqual(['引用 猫の視点', '引用 名前はまだ無い']);
  });

  it('引用を編集して削除できる。キャンセルでは何も変わらない', async () => {
    const { repository } = await show();
    await waitFor(() => expect(screen.getByLabelText('引用 名前はまだ無い')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('引用 名前はまだ無い'));
    expect(screen.getByText('引用を直す')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByText('この引用を削除しますか？')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect((await stored(repository))?.quotes).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    });
    await waitFor(() => expect(screen.getByText('1 件')).toBeTruthy());
    expect((await stored(repository))?.quotes).toEqual([]);
    expect((await stored(repository))?.memos).toHaveLength(1);
  });
});

describe('「読み終えた」', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completed・終了日=今日で保存し、ほかは変えず onFinished を呼ぶ', async () => {
    const onFinished = jest.fn();
    const { repository } = await show([{ ...base, startDate: null }], { onFinished });
    await waitFor(() => expect(screen.getByRole('button', { name: '読み終えた' })).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '読み終えた' }));
    });
    expect(onFinished).toHaveBeenCalledWith('x');
    expect(triggerImpactHaptic).toHaveBeenCalledTimes(1);
    const saved = await stored(repository);
    expect(saved).toMatchObject({
      status: 'completed',
      endDate: todayString(),
      startDate: null,
      title: '吾輩は猫である',
      shelfIds: ['s1', 's2'],
    });
    expect(saved?.memos).toHaveLength(1);
  });

  it('終了日がすでにあれば変えない', async () => {
    const { repository } = await show([{ ...base, endDate: '2024-10-26' }]);
    await waitFor(() => expect(screen.getByRole('button', { name: '読み終えた' })).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '読み終えた' }));
    });
    expect((await stored(repository))?.endDate).toBe('2024-10-26');
  });

  it('保存に失敗したらエラーを出して遷移しない', async () => {
    const onFinished = jest.fn();
    await show([base], { onFinished }, (repo) => ({ ...repo, update: async () => Promise.reject(new Error('x')) }));
    await waitFor(() => expect(screen.getByRole('button', { name: '読み終えた' })).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '読み終えた' }));
    });
    expect(screen.getByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
    expect(onFinished).not.toHaveBeenCalled();
    expect(triggerImpactHaptic).not.toHaveBeenCalled();
  });
});
