import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { createRecordRepository, RECORDS_STORAGE_KEY, type RecordRepository } from '../../lib/recordRepository';
import { createShelfRepository, SHELVES_STORAGE_KEY } from '../../lib/shelfRepository';
import { withRepository } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { triggerImpactHaptic } from '../../lib/haptics';
import { RereadScreen } from '../RereadScreen';

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

const at = (n: number) => `2024-01-0${n}T00:00:00.000Z`;

const full = makeRecord({
  id: 'x',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  status: 'completed',
  startDate: '2026-10-01',
  endDate: '2026-10-20',
  rating: 4.2,
  favorite: true,
  oneLiner: '猫の目で人間を笑う本',
  shelfIds: ['s1', 's2'],
  postReadMemos: [
    { id: 'p1', text: '読み終えて、笑ってしまった', createdAt: at(3) },
    { id: 'p2', text: '自由な感想', createdAt: at(2) },
  ],
  quotes: [{ id: 'q1', text: '名前はまだ無い', page: '12', comment: 'ここが好き', createdAt: at(1) }],
  memos: [
    { id: 'm1', text: 'あとのメモ', page: '88', createdAt: at(1) },
    { id: 'm2', text: 'さきのメモ', page: '5', createdAt: at(2) },
    { id: 'm3', text: 'ページなしメモ', page: null, createdAt: at(1) },
  ],
});

type Handlers = { onEdit?: jest.Mock; onWrite?: jest.Mock; onStart?: jest.Mock; onBack?: jest.Mock };

async function show(
  records: MediaRecord[] = [full],
  handlers: Handlers = {},
  failGetAll = false,
  update?: RecordRepository['update'],
) {
  const { storage } = createMemoryStorage({
    [RECORDS_STORAGE_KEY]: JSON.stringify(records),
    [SHELVES_STORAGE_KEY]: JSON.stringify(SHELVES),
  });
  const real = createRecordRepository(storage);
  const repository: RecordRepository = failGetAll
    ? { ...real, getAll: () => Promise.reject(new Error('fail')) }
    : update
      ? { ...real, update }
      : real;
  await renderRouter({
    index: () =>
      withRepository(repository, <RereadScreen recordId="x" {...handlers} />, createShelfRepository(storage)),
    other: () => null,
  });
  return real;
}

describe('RereadScreen の表示', () => {
  it('上部は読んでる本と同じ組み（ステータスと期間・タイトル・作者）。ひとこと・星と言葉・お気に入りも出す', async () => {
    await show();
    await screen.findByText('吾輩は猫である');
    expect(screen.getByText('読んだ · 10/1 – 10/20')).toBeTruthy();
    expect(screen.getByText('夏目漱石 · SF、哲学')).toBeTruthy();
    expect(screen.getByText('「猫の目で人間を笑う本」')).toBeTruthy();
    expect(screen.getByLabelText('どうだった？ 4.2 よかった')).toBeTruthy();
    expect(screen.getByText('4.2')).toBeTruthy();
    expect(screen.getByText('よかった')).toBeTruthy();
    expect(screen.getByText('お気に入り')).toBeTruthy();
  });

  it('ない項目は出さない', async () => {
    await show([
      { ...full, creator: null, startDate: null, endDate: null, oneLiner: '  ', rating: null, favorite: false },
    ]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText(/ · /)).toBeNull();
    expect(screen.queryByText(/「/)).toBeNull();
    expect(screen.queryByLabelText(/どうだった？ /)).toBeNull();
    expect(screen.queryByText('お気に入り')).toBeNull();
  });

  it('作者だけの行を出す', async () => {
    await show([{ ...full, endDate: null, startDate: null, shelfIds: [] }]);
    expect(await screen.findByText('夏目漱石')).toBeTruthy();
  });

  it('終えた日だけなら「読んだ · 終えた日」', async () => {
    await show([{ ...full, creator: null, startDate: null }]);
    expect(await screen.findByText('読んだ · 10/20')).toBeTruthy();
  });

  it('読みたい・途中でやめた本もステータスを上部に出す', async () => {
    await show([{ ...full, status: 'planned', startDate: null, endDate: null }]);
    expect(await screen.findByText('読みたい')).toBeTruthy();
  });

  it('途中でやめた本は「途中でやめた · 終えた日 まで」', async () => {
    await show([{ ...full, status: 'dropped', endDate: '2026-10-05' }]);
    expect(await screen.findByText('途中でやめた · 10/5 まで')).toBeTruthy();
  });

  it('入っている本棚を作者の横に出す', async () => {
    await show([{ ...full, shelfIds: ['s1'] }]);
    expect(await screen.findByText('夏目漱石 · SF')).toBeTruthy();
  });

  it('読後メモを書いた順に、ひと続きの文章として並べる（朱の書き出しの部分はない）', async () => {
    await show();
    const memo = await screen.findByText('読み終えて、笑ってしまった');
    expect(StyleSheet.flatten(memo.props.style).color).not.toBe(colors.ribbon);
    expect(screen.queryByText('読み終えて、')).toBeNull();
    const order = ['自由な感想', '読み終えて、笑ってしまった'].map((t) => JSON.stringify(screen.toJSON()).indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });

  it('空白だけの読後メモは出さない', async () => {
    await show([{ ...full, postReadMemos: [{ id: 'p1', text: '  ', createdAt: at(3) }] }]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryAllByTestId('rule')).toHaveLength(0);
  });

  it('「メモと引用」は件数つきで、引用とメモがページ順（ページなしは後ろ）に並ぶ', async () => {
    await show();
    await screen.findByText('メモと引用');
    expect(screen.getByText('4 件')).toBeTruthy();
    expect(screen.getByText('p.12')).toBeTruthy();
    expect(screen.getByText('ここが好き')).toBeTruthy();
    const json = JSON.stringify(screen.toJSON());
    const order = ['さきのメモ', '名前はまだ無い', 'あとのメモ', 'ページなしメモ'].map((t) => json.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });

  it('上から、ひとこと → 読後メモ（件数・本文・書く）→ メモと引用 → 本棚 の順', async () => {
    await show();
    await screen.findByText('メモと引用');
    expect(screen.getByText('2 件')).toBeTruthy();
    const json = JSON.stringify(screen.toJSON());
    const order = [
      '猫の目で人間を笑う本',
      '"読後メモ"',
      '自由な感想',
      '＋ 読後メモを書く',
      'メモと引用',
      'さきのメモ',
      '＋ メモ・引用を書く',
      '本棚',
    ].map((t) => json.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });

  it('読んでる本の画面と同じ並びで出る', async () => {
    const find = (json: string) =>
      ['さきのメモ', '名前はまだ無い', 'あとのメモ', 'ページなしメモ'].map((t) => json.indexOf(t));
    await show();
    await screen.findByText('メモと引用');
    const reread = find(JSON.stringify(screen.toJSON()));
    expect(reread.every((i) => i >= 0)).toBe(true);
    expect(reread).toEqual([...reread].sort((x, y) => x - y));
    // 読んでる本の画面（ReadingScreen.test）も同じデータ・同じ並びで検証している
  });

  it('読後メモが 0 件なら、段の中に案内と「＋ 読後メモを書く」だけを出す', async () => {
    await show([{ ...full, postReadMemos: [] }]);
    await screen.findByText('メモと引用');
    expect(screen.getByText('読後メモ')).toBeTruthy();
    expect(screen.getByText('0 件')).toBeTruthy();
    expect(screen.getByText(/^読み終えた直後の言葉を残しておくと、あとで人に勧めるときに助けになります。/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '読後メモを書く' })).toBeTruthy();
    expect(screen.queryByTestId('rule')).toBeNull();
  });

  it('読みたい本でメモ・引用が 0 件なら見出しごと出さない', async () => {
    await show([{ ...full, status: 'planned', memos: [], quotes: [] }]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText('メモと引用')).toBeNull();
  });

  it('読みたい本でも引用があれば出し、押せない', async () => {
    await show([{ ...full, status: 'planned', memos: [] }]);
    expect(await screen.findByText('メモと引用')).toBeTruthy();
    expect(screen.getByText('名前はまだ無い')).toBeTruthy();
    expect(screen.queryByLabelText('メモ・引用を書く')).toBeNull();
  });

  it('0 件で追加できるときは空文言を出す', async () => {
    await show([{ ...full, memos: [], quotes: [] }]);
    expect(await screen.findByText('まだ何もありません。気づいたことを、ひとこと残してみませんか')).toBeTruthy();
    expect(screen.getByText('0 件')).toBeTruthy();
  });

  it('「評価」「問い」「お題」の語が出ない', async () => {
    await show();
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText(/評価|問い|お題/)).toBeNull();
    expect(screen.queryByLabelText(/評価|問い|お題/)).toBeNull();
  });

});

describe('RereadScreen の入口', () => {
  it('「＋ 読後メモを書く」は点線のボタンで、押すと onWrite', async () => {
    const onWrite = jest.fn();
    await show([full], { onWrite });
    const button = await screen.findByRole('button', { name: '読後メモを書く' });
    const style = StyleSheet.flatten(button.props.style) as { minHeight?: number; borderStyle?: string };
    expect(style.minHeight ?? 0).toBeGreaterThanOrEqual(44);
    expect(style.borderStyle).toBe('dashed');
    await fireEvent.press(button);
    expect(onWrite).toHaveBeenCalledWith('x');
  });

  it('何も書いていない本でも、案内の下のボタンから onWrite', async () => {
    const onWrite = jest.fn();
    await show(
      [{ ...full, oneLiner: null, postReadMemos: [], quotes: [], memos: [], rating: null, favorite: false }],
      { onWrite },
    );
    await screen.findByText(/読み終えた直後の言葉/);
    await fireEvent.press(screen.getByRole('button', { name: '読後メモを書く' }));
    expect(onWrite).toHaveBeenCalledWith('x');
  });

  it('「書き出しの続きを書く」の行はない', async () => {
    await show();
    await screen.findByText('メモと引用');
    expect(screen.queryByText(/書き出し/)).toBeNull();
    expect(screen.getAllByRole('button', { name: '読後メモを書く' })).toHaveLength(1);
  });

  it('途中でやめた本にも読後メモの段を出す', async () => {
    await show([{ ...full, status: 'dropped' }]);
    expect(await screen.findByText('読後メモ')).toBeTruthy();
    expect(screen.getByLabelText('読後メモ 自由な感想')).toBeTruthy();
  });

  it('読みたい本には読後メモの段を出さない（読後メモが残っていても）', async () => {
    await show([{ ...full, status: 'planned', startDate: null, endDate: null }]);
    await screen.findByText('読み始める');
    expect(screen.queryByText('読後メモ')).toBeNull();
    expect(screen.queryByText('自由な感想')).toBeNull();
    expect(screen.queryByRole('button', { name: '読後メモを書く' })).toBeNull();
    expect(screen.queryByText(/読み終えた直後の言葉/)).toBeNull();
  });

  it('「編集」で onEdit、戻るで onBack', async () => {
    const onEdit = jest.fn();
    const onBack = jest.fn();
    await show([full], { onEdit, onBack });
    await fireEvent.press(await screen.findByRole('button', { name: '編集' }));
    expect(onEdit).toHaveBeenCalledWith('x');
    const back = screen.getByRole('button', { name: '戻る' });
    expect(StyleSheet.flatten(back.props.style).backgroundColor).toBeUndefined();
    await fireEvent.press(back);
    expect(onBack).toHaveBeenCalled();
  });

  it('期間・評価の言葉の色・お気に入りの枠・罫線（引用には付けない）', async () => {
    await show();
    expect(await screen.findByText('読んだ · 10/1 – 10/20')).toBeTruthy();
    const word = screen.getByText('よかった');
    expect(StyleSheet.flatten(word.props.style).color).toBe(colors.ribbon);
    expect(StyleSheet.flatten(word.props.style).fontSize).toBe(
      StyleSheet.flatten(screen.getByText('4.2').props.style).fontSize,
    );
    const pill = screen.getByText('お気に入り').parent;
    expect(StyleSheet.flatten(pill?.props.style).borderColor).toBe(colors.ribbon);
    // 読後メモ 2 件に 1 本ずつ
    expect(screen.getAllByTestId('rule')).toHaveLength(2);
  });
});

describe('RereadScreen の読み始める', () => {
  const today = /^\d{4}-\d{2}-\d{2}$/;
  const planned = { ...full, status: 'planned' as const, startDate: null, endDate: null };

  it('planned では案内と「読み始める」を出し、押すと in_progress・今日・終えた日なしで保存して onStart', async () => {
    const onStart = jest.fn();
    const repository = await show([planned], { onStart });
    expect(await screen.findByText(/読み始めると、読んでる本の画面に移って/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '読み始める' }));
    await waitFor(() => expect(onStart).toHaveBeenCalledWith('x'));
    expect(triggerImpactHaptic).toHaveBeenCalled();
    const saved = (await repository.getAll()).find((r) => r.id === 'x');
    expect(saved?.status).toBe('in_progress');
    expect(saved?.startDate).toMatch(today);
    expect(saved?.endDate).toBeNull();
    expect(saved?.memos).toHaveLength(3);
    expect(saved?.quotes).toHaveLength(1);
    expect(saved?.postReadMemos).toHaveLength(2);
    expect(saved?.oneLiner).toBe('猫の目で人間を笑う本');
  });

  it('dropped では「もう一度読む」を出し、同じく in_progress にして onStart', async () => {
    const onStart = jest.fn();
    const repository = await show(
      [{ ...planned, status: 'dropped', startDate: '2020-01-01', endDate: '2020-02-02' }],
      { onStart },
    );
    expect(await screen.findByText(/もう一度読み始めると/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '読み始める' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'もう一度読む' }));
    await waitFor(() => expect(onStart).toHaveBeenCalledWith('x'));
    const saved = (await repository.getAll()).find((r) => r.id === 'x');
    expect(saved?.status).toBe('in_progress');
    expect(saved?.startDate).not.toBe('2020-01-01');
    expect(saved?.endDate).toBeNull();
  });

  it('completed には出さない', async () => {
    await show();
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByRole('button', { name: '読み始める' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'もう一度読む' })).toBeNull();
  });

  it('保存に失敗するとエラーを出し、onStart は呼ばず、再度押せる', async () => {
    const onStart = jest.fn();
    await show([planned], { onStart }, false, () => Promise.reject(new Error('fail')));
    await fireEvent.press(await screen.findByRole('button', { name: '読み始める' }));
    const message = await screen.findByText('保存できませんでした。もう一度お試しください');
    expect((StyleSheet.flatten(message.props.style) as { color?: string }).color).toBe(colors.danger);
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '読み始める' }).props.accessibilityState?.disabled).not.toBe(true);
  });

  it('保存中はボタンが押せない', async () => {
    await show([planned], {}, false, () => new Promise(() => undefined));
    await fireEvent.press(await screen.findByRole('button', { name: '読み始める' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '読み始める' }).props.accessibilityState?.disabled).toBe(true),
    );
  });
});

describe('RereadScreen の本棚', () => {
  it('本棚名を出す', async () => {
    await show();
    expect(await screen.findByLabelText('本棚、SF、哲学')).toBeTruthy();
  });

  it('入っていなければ「まだ入れていません」', async () => {
    await show([{ ...full, shelfIds: [] }]);
    expect(await screen.findByLabelText('本棚、まだ入れていません')).toBeTruthy();
  });

  it('シートで選んで保存すると shelfIds だけ変わり、表示に反映する', async () => {
    const repository = await show();
    await fireEvent.press(await screen.findByLabelText('本棚、SF、哲学'));
    expect((await screen.findAllByText('吾輩は猫である')).length).toBeGreaterThan(1);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'SF' }));
    await fireEvent.press(screen.getByRole('button', { name: '1 つの本棚に入れる' }));
    await waitFor(() => expect(screen.getByLabelText('本棚、哲学')).toBeTruthy());
    const saved = (await repository.getAll()).find((r) => r.id === 'x');
    expect(saved?.shelfIds).toEqual(['s2']);
    expect(saved?.oneLiner).toBe(full.oneLiner);
    expect(saved?.memos).toHaveLength(3);
  });

  it('保存に失敗したらシート内にエラーを出す', async () => {
    const repository = await show();
    jest.spyOn(repository, 'update').mockRejectedValue(new Error('fail'));
    await fireEvent.press(await screen.findByLabelText('本棚、SF、哲学'));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'SF' }));
    await fireEvent.press(screen.getByRole('button', { name: '1 つの本棚に入れる' }));
    await waitFor(() => expect(screen.getByText('保存できませんでした')).toBeTruthy());
  });
});

describe('RereadScreen の読み込み', () => {
  it('記録が見つからないときは「本が見つかりません」と戻る手段を出す', async () => {
    const onBack = jest.fn();
    await show([makeRecord({ id: 'other' })], { onBack });
    await screen.findByText('本が見つかりません');
    await fireEvent.press(screen.getByText('本棚へ戻る'));
    expect(onBack).toHaveBeenCalled();
  });

  it('読み込みに失敗しても落ちず、見つからない表示になる', async () => {
    await show([full], {}, true);
    expect(await screen.findByText('本が見つかりません')).toBeTruthy();
  });

  it('フォーカスのたびに読み直す', async () => {
    const repository = await show();
    await screen.findByText('「猫の目で人間を笑う本」');
    const target = (await repository.getAll()).find((r) => r.id === 'x');
    if (!target) throw new Error('missing');
    const { id: _i, createdAt: _c, updatedAt: _u, spineColor: _s, ...input } = target;
    await repository.update('x', { ...input, oneLiner: '書き換えたひとこと' });
    await act(async () => router.push('/other'));
    await act(async () => router.back());
    await waitFor(() => expect(screen.getByText('「書き換えたひとこと」')).toBeTruthy());
  });
});

describe('RereadScreen のメモ・引用', () => {
  const ADD = 'メモ・引用を書く';
  const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');
  const open = async () => {
    await fireEvent.press(await screen.findByRole('button', { name: ADD }));
    await waitFor(() => expect(screen.getByLabelText('本文')).toBeTruthy());
  };

  it('completed ではメモ・引用がなくても入口が出る', async () => {
    await show([makeRecord({ id: 'x', status: 'completed' })]);
    expect(await screen.findByLabelText(ADD)).toBeTruthy();
  });

  it('dropped では出て、planned では出ない', async () => {
    await show([makeRecord({ id: 'x', status: 'dropped' })]);
    expect(await screen.findByLabelText(ADD)).toBeTruthy();
  });

  it('planned では入口もシートも出ず、過去のメモは押せない', async () => {
    await show([
      makeRecord({ id: 'x', status: 'planned', memos: [{ id: 'm', text: '昔のメモ', page: null, createdAt: at(1) }] }),
    ]);
    expect(await screen.findByText('昔のメモ')).toBeTruthy();
    expect(screen.queryByLabelText(ADD)).toBeNull();
    expect(screen.queryByLabelText('メモ 昔のメモ')).toBeNull();
  });

  it('メモを追加すると保存され、ほかの項目は残る', async () => {
    const repository = await show();
    await open();
    await fireEvent.changeText(screen.getByLabelText('本文'), '思い出したこと');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    await waitFor(() => expect(screen.getByLabelText('メモ 思い出したこと')).toBeTruthy());
    const saved = await stored(repository);
    expect(saved?.memos.map((m) => m.text)).toContain('思い出したこと');
    expect(saved?.oneLiner).toBe('猫の目で人間を笑う本');
    expect(saved?.rating).toBe(4.2);
    expect(saved?.shelfIds).toEqual(['s1', 's2']);
    expect(saved?.postReadMemos).toHaveLength(2);
  });

  it('引用を追加できる', async () => {
    const repository = await show();
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    await fireEvent.changeText(screen.getByLabelText('本文'), '新しい引用');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    await waitFor(() => expect(screen.getByLabelText('引用 新しい引用')).toBeTruthy());
    expect((await stored(repository))?.quotes.map((q) => q.text)).toEqual(['名前はまだ無い', '新しい引用']);
  });

  it('メモを押して直せる', async () => {
    const repository = await show();
    await fireEvent.press(await screen.findByLabelText('メモ さきのメモ'));
    expect(screen.getByText('メモを直す')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('本文'), '直したメモ');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    await waitFor(() => expect(screen.getByLabelText('メモ 直したメモ')).toBeTruthy());
    expect(screen.queryByLabelText('メモ さきのメモ')).toBeNull();
    expect((await stored(repository))?.memos.map((m) => m.text)).toContain('直したメモ');
  });

  it('引用を押して直せる', async () => {
    await show();
    await fireEvent.press(await screen.findByLabelText('引用 名前はまだ無い'));
    expect(screen.getByText('引用を直す')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('本文'), '直した引用');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    await waitFor(() => expect(screen.getByLabelText('引用 直した引用')).toBeTruthy());
  });

  it('削除すると消え、メモが 0 件でも入口は残る', async () => {
    const only = makeRecord({
      id: 'x',
      status: 'completed',
      memos: [{ id: 'm1', text: '唯一のメモ', page: null, createdAt: at(1) }],
    });
    const repository = await show([only]);
    await fireEvent.press(await screen.findByLabelText('メモ 唯一のメモ'));
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    });
    await waitFor(() => expect(screen.queryByLabelText('メモ 唯一のメモ')).toBeNull());
    expect((await stored(repository))?.memos).toEqual([]);
    expect(screen.getByLabelText(ADD)).toBeTruthy();
  });
});

describe('RereadScreen の読後メモを直す', () => {
  const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');
  const open = async (text: string) => {
    await fireEvent.press(await screen.findByLabelText(`読後メモ ${text}`));
    await waitFor(() => expect(screen.getByText('読後メモを直す')).toBeTruthy());
  };

  it('読後メモを押すと、本のタイトル・「閉じる」・全文の入った入力欄 1 つのシートが開く', async () => {
    await show();
    await open('自由な感想');
    expect(screen.getAllByText('吾輩は猫である').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    expect(screen.getByLabelText('読後メモ').props.value).toBe('自由な感想');
    expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'この読後メモを削除' })).toBeTruthy();
  });

  it('直して保存すると、その 1 件だけが変わり、並び・ほかの項目は残る', async () => {
    const repository = await show();
    await open('自由な感想');
    await fireEvent.changeText(screen.getByLabelText('読後メモ'), '直した感想');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    await waitFor(() => expect(screen.getByLabelText('読後メモ 直した感想')).toBeTruthy());
    expect(screen.queryByText('読後メモを直す')).toBeNull();
    const saved = await stored(repository);
    expect(saved?.postReadMemos).toEqual([
      { id: 'p1', text: '読み終えて、笑ってしまった', createdAt: at(3) },
      { id: 'p2', text: '直した感想', createdAt: at(2) },
    ]);
    expect(saved?.oneLiner).toBe('猫の目で人間を笑う本');
    expect(saved?.memos).toHaveLength(3);
  });

  it('空白だけにすると「保存する」は押せない', async () => {
    await show();
    await open('自由な感想');
    await fireEvent.changeText(screen.getByLabelText('読後メモ'), '  \n ');
    expect(screen.getByRole('button', { name: '保存する' })).toBeDisabled();
  });

  it('削除は確認してから消す。キャンセルなら戻る', async () => {
    const repository = await show();
    await open('自由な感想');
    await fireEvent.press(screen.getByRole('button', { name: 'この読後メモを削除' }));
    expect(screen.getByText('この読後メモを削除しますか？')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.getByText('読後メモを直す')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'この読後メモを削除' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    });
    await waitFor(() => expect(screen.queryByLabelText('読後メモ 自由な感想')).toBeNull());
    expect(screen.getByText('1 件')).toBeTruthy();
    expect((await stored(repository))?.postReadMemos.map((m) => m.id)).toEqual(['p1']);
  });

  it('「閉じる」で保存せずに閉じる', async () => {
    const repository = await show();
    await open('自由な感想');
    await fireEvent.changeText(screen.getByLabelText('読後メモ'), '保存しない');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen.queryByText('読後メモを直す')).toBeNull());
    expect(screen.getByLabelText('読後メモ 自由な感想')).toBeTruthy();
    expect((await stored(repository))?.postReadMemos.map((m) => m.text)).toContain('自由な感想');
  });

  it('保存に失敗したらシートにエラーを出し、入力を残す', async () => {
    await show([full], {}, false, () => Promise.reject(new Error('fail')));
    await open('自由な感想');
    await fireEvent.changeText(screen.getByLabelText('読後メモ'), '直した');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    expect(await screen.findByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
    expect(screen.getByLabelText('読後メモ').props.value).toBe('直した');
  });

  it('削除に失敗したらエラーを出してシートに戻る', async () => {
    await show([full], {}, false, () => Promise.reject(new Error('fail')));
    await open('自由な感想');
    await fireEvent.press(screen.getByRole('button', { name: 'この読後メモを削除' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    });
    expect(await screen.findByText('削除できませんでした。もう一度お試しください')).toBeTruthy();
    expect(screen.getByText('読後メモを直す')).toBeTruthy();
  });
});

describe('RereadScreen のひとこと・どうだった？を直す', () => {
  const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');
  const opened = () => waitFor(() => expect(screen.getByText('星をなぞると 0.1 ずつ変わります')).toBeTruthy());
  const slider = () => screen.getByLabelText('どうだった？');
  // 何もない本では、画面の入口のボタンも同じ「この本をひとことで」なので、入力欄に絞る
  const oneLinerInput = () => {
    const found = screen.getAllByLabelText('この本をひとことで').find((el) => typeof el.props.onChangeText === 'function');
    if (!found) throw new Error('入力欄がありません');
    return found;
  };
  const drag = async (x: number) => {
    await fireEvent(slider(), 'layout', { nativeEvent: { layout: { width: 100 } } });
    await fireEvent(slider(), 'responderGrant', { nativeEvent: { locationX: x, pageX: x } });
  };
  const saveSheet = async () => {
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    await waitFor(() => expect(screen.queryByText('星をなぞると 0.1 ずつ変わります')).toBeNull());
  };

  it('ひとことを押すと、入っている値のシートが開く', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' }));
    await opened();
    expect(screen.getAllByText('吾輩は猫である').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    expect(oneLinerInput().props.value).toBe('猫の目で人間を笑う本');
    expect(screen.getByText('どうだった？')).toBeTruthy();
    expect(slider().props.accessibilityValue).toEqual({ text: '4.2' });
    expect(screen.getAllByText('4.2')).toHaveLength(2);
    expect(screen.getAllByText('よかった').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('switch', { name: 'お気に入り' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('星・数字・言葉・お気に入りの行を押してもシートが開く', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: 'どうだった？ 4.2 よかった、お気に入り' }));
    await opened();
    expect(oneLinerInput().props.value).toBe('猫の目で人間を笑う本');
  });

  it('直して保存すると、読み返す画面と保存した記録に反映され、ほかの項目は残る', async () => {
    const repository = await show();
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' }));
    await opened();
    await fireEvent.changeText(oneLinerInput(), '  人間を外から見る本 ');
    await drag(73);
    expect(screen.getByText('3.7')).toBeTruthy();
    expect(screen.getByText('まあまあ')).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch', { name: 'お気に入り' }));
    await saveSheet();
    expect(screen.getByText('「人間を外から見る本」')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'どうだった？ 3.7 まあまあ' })).toBeTruthy();
    expect(screen.queryByText('お気に入り')).toBeNull();
    const saved = await stored(repository);
    expect(saved).toMatchObject({ oneLiner: '人間を外から見る本', rating: 3.7, favorite: false });
    expect(saved?.postReadMemos).toHaveLength(2);
    expect(saved?.memos).toHaveLength(3);
    expect(saved?.shelfIds).toEqual(['s1', 's2']);
  });

  it('「星をなしにする」で、どうだった？を未入力に戻して保存できる', async () => {
    const repository = await show([{ ...full, favorite: false }]);
    await fireEvent.press(await screen.findByRole('button', { name: 'どうだった？ 4.2 よかった' }));
    await opened();
    await fireEvent.press(screen.getByRole('button', { name: '星をなしにする' }));
    expect(screen.getByText('まだ選んでいません')).toBeTruthy();
    expect(slider().props.accessibilityValue).toEqual({ text: '未選択' });
    expect(screen.queryByRole('button', { name: '星をなしにする' })).toBeNull();
    await saveSheet();
    expect(screen.queryByText('4.2')).toBeNull();
    expect((await stored(repository))?.rating).toBeNull();
    // ひとことは残るので、ひとことから開ける
    expect(screen.getByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' })).toBeTruthy();
  });

  it('ひとことを空にして保存すると、ひとことはなくなり、星の行から開ける', async () => {
    const repository = await show();
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' }));
    await opened();
    await fireEvent.changeText(oneLinerInput(), '   ');
    await saveSheet();
    expect(screen.queryByText('「猫の目で人間を笑う本」')).toBeNull();
    expect((await stored(repository))?.oneLiner).toBeNull();
    expect(screen.getByRole('button', { name: 'どうだった？ 4.2 よかった、お気に入り' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'この本をひとことで' })).toBeNull();
  });

  it('ひとことも星もお気に入りもない本には「＋ この本をひとことで」の入口があり、そこから入れられる', async () => {
    const repository = await show([{ ...full, oneLiner: null, rating: null, favorite: false }]);
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで' }));
    await opened();
    expect(oneLinerInput().props.value).toBe('');
    expect(screen.getByText('まだ選んでいません')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '星をなしにする' })).toBeNull();
    await fireEvent.changeText(oneLinerInput(), 'はじめてのひとこと');
    await drag(100);
    await fireEvent.press(screen.getByRole('switch', { name: 'お気に入り' }));
    await saveSheet();
    expect(screen.getByText('「はじめてのひとこと」')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'どうだった？ 5.0 最高、お気に入り' })).toBeTruthy();
    expect(screen.queryByText('＋ この本をひとことで')).toBeNull();
    expect(await stored(repository)).toMatchObject({ oneLiner: 'はじめてのひとこと', rating: 5, favorite: true });
  });

  it('「閉じる」で保存せずに閉じる', async () => {
    const repository = await show();
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' }));
    await opened();
    await fireEvent.changeText(oneLinerInput(), '保存しない');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen.queryByText('星をなぞると 0.1 ずつ変わります')).toBeNull());
    expect(screen.getByText('「猫の目で人間を笑う本」')).toBeTruthy();
    expect((await stored(repository))?.oneLiner).toBe('猫の目で人間を笑う本');
  });

  it('保存に失敗したらシートにエラーを出し、入力を残す', async () => {
    await show([full], {}, false, () => Promise.reject(new Error('fail')));
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' }));
    await opened();
    await fireEvent.changeText(oneLinerInput(), '直した');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    });
    expect(await screen.findByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
    expect(oneLinerInput().props.value).toBe('直した');
  });

  it('読みたい本では、ひとこと・星は表示だけで押せず、入口も出さない', async () => {
    await show([{ ...full, status: 'planned' }]);
    expect(await screen.findByText('「猫の目で人間を笑う本」')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'どうだった？ 4.2 よかった、お気に入り' })).toBeNull();
    await fireEvent.press(screen.getByText('「猫の目で人間を笑う本」'));
    expect(screen.queryByText('星をなぞると 0.1 ずつ変わります')).toBeNull();
  });

  it('何も入っていない読みたい本にも入口を出さない', async () => {
    await show([{ ...full, status: 'planned', oneLiner: null, rating: null, favorite: false }]);
    expect(await screen.findByText('読み始める')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'この本をひとことで' })).toBeNull();
  });

  it('途中でやめた本では直せる', async () => {
    await show([{ ...full, status: 'dropped' }]);
    await fireEvent.press(await screen.findByRole('button', { name: 'この本をひとことで 猫の目で人間を笑う本' }));
    await opened();
  });
});
