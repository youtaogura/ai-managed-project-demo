import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { createRecordRepository, RECORDS_STORAGE_KEY, type RecordRepository } from '../../lib/recordRepository';
import { createShelfRepository, SHELVES_STORAGE_KEY } from '../../lib/shelfRepository';
import { withRepository } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { RereadScreen } from '../RereadScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
  starters: [{ id: 'st1', starter: '読み終えて、', text: '笑ってしまった', createdAt: at(3) }],
  quotes: [{ id: 'q1', text: '名前はまだ無い', page: '12', comment: 'ここが好き', createdAt: at(1) }],
  freeTexts: [{ id: 'f1', text: '自由な感想', createdAt: at(2) }],
  memos: [
    { id: 'm1', text: 'あとのメモ', page: '88', createdAt: at(1) },
    { id: 'm2', text: 'さきのメモ', page: '5', createdAt: at(2) },
    { id: 'm3', text: 'ページなしメモ', page: null, createdAt: at(1) },
  ],
});

type Handlers = { onEdit?: jest.Mock; onWrite?: jest.Mock; onBack?: jest.Mock };

async function show(records: MediaRecord[] = [full], handlers: Handlers = {}, failGetAll = false) {
  const { storage } = createMemoryStorage({
    [RECORDS_STORAGE_KEY]: JSON.stringify(records),
    [SHELVES_STORAGE_KEY]: JSON.stringify(SHELVES),
  });
  const real = createRecordRepository(storage);
  const repository: RecordRepository = failGetAll
    ? { ...real, getAll: () => Promise.reject(new Error('fail')) }
    : real;
  await renderRouter({
    index: () =>
      withRepository(repository, <RereadScreen recordId="x" {...handlers} />, createShelfRepository(storage)),
    other: () => null,
  });
  return real;
}

describe('RereadScreen の表示', () => {
  it('タイトル・作者 · 期間・ひとこと・星と言葉・お気に入りを出す', async () => {
    await show();
    await screen.findByText('吾輩は猫である');
    expect(screen.getByText('夏目漱石 · 2026/10/1–10/20')).toBeTruthy();
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
    await show([{ ...full, endDate: null, startDate: null }]);
    expect(await screen.findByText('夏目漱石')).toBeTruthy();
  });

  it('期間だけの行を出す', async () => {
    await show([{ ...full, creator: null, startDate: null }]);
    expect(await screen.findByText('2026/10/20')).toBeTruthy();
  });

  it('書き出しは同じ Text の中で続きと一続きになり、引用・自由記述と書いた順に並ぶ', async () => {
    await show();
    await screen.findByLabelText('読み終えて、笑ってしまった');
    expect(screen.getByText('読み終えて、')).toBeTruthy();
    expect(screen.getByText('名前はまだ無い')).toBeTruthy();
    expect(screen.getByText('p.12')).toBeTruthy();
    expect(screen.getByText('ここが好き')).toBeTruthy();
    const texts = screen.getAllByText(/名前はまだ無い|自由な感想|笑ってしまった/).map((n) => n.props.children);
    expect(texts.flat().join('')).toContain('名前はまだ無い');
    const order = ['名前はまだ無い', '自由な感想', '笑ってしまった'].map((t) =>
      JSON.stringify(screen.toJSON()).indexOf(t),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
  });

  it('続きが空白だけの書き出しは出さない', async () => {
    await show([{ ...full, starters: [{ id: 'st1', starter: '空の書き出し', text: '  ', createdAt: at(3) }] }]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText('空の書き出し')).toBeNull();
  });

  it('メモは「メモ」の下にページ順（ページなしは後ろ）で出る', async () => {
    await show();
    await screen.findByText('メモ');
    const memos = screen.getAllByText(/メモ$/).map((n) => n.props.children as string).filter((t) => t !== 'メモ');
    expect(memos).toEqual(['さきのメモ', 'あとのメモ', 'ページなしメモ']);
  });

  it('メモが 0 件なら見出しごと出さない', async () => {
    await show([{ ...full, memos: [] }]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText('メモ')).toBeNull();
  });

  it('「評価」「問い」「お題」の語が出ない', async () => {
    await show();
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText(/評価|問い|お題/)).toBeNull();
    expect(screen.queryByLabelText(/評価|問い|お題/)).toBeNull();
  });

});

describe('RereadScreen の入口', () => {
  it('completed では書いてある本でも「書き出しの続きを書く」の行を出し、押すと onWrite', async () => {
    const onWrite = jest.fn();
    await show([full], { onWrite });
    const row = await screen.findByRole('button', { name: '書き出しの続きを書く' });
    const height = (StyleSheet.flatten(row.props.style) as { minHeight?: number }).minHeight ?? 0;
    expect(height).toBeGreaterThanOrEqual(44);
    expect(screen.queryByText(/まだ何も書いていません/)).toBeNull();
    await fireEvent.press(row);
    expect(onWrite).toHaveBeenCalledWith('x');
  });

  it('completed 以外では行も案内も出さない', async () => {
    await show([{ ...full, status: 'planned' }]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByRole('button', { name: '書き出しの続きを書く' })).toBeNull();
  });

  it('何も書いていない completed の本では案内とボタンを出し、押すと onWrite', async () => {
    const onWrite = jest.fn();
    await show(
      [{ ...full, oneLiner: null, starters: [], quotes: [], freeTexts: [], memos: [], rating: null, favorite: false }],
      { onWrite },
    );
    expect(await screen.findByText(/まだ何も書いていません。読み終えた直後の言葉/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '書き出しの続きを書く' }));
    expect(onWrite).toHaveBeenCalledWith('x');
  });

  it('何も書いていなくても completed 以外では案内を出さない', async () => {
    await show([
      { ...full, status: 'planned', oneLiner: null, starters: [], quotes: [], freeTexts: [], memos: [] },
    ]);
    await screen.findByText('吾輩は猫である');
    expect(screen.queryByText(/まだ何も書いていません/)).toBeNull();
  });

  it('「編集」で onEdit、戻るで onBack', async () => {
    const onEdit = jest.fn();
    const onBack = jest.fn();
    await show([full], { onEdit, onBack });
    await fireEvent.press(await screen.findByRole('button', { name: '編集' }));
    expect(onEdit).toHaveBeenCalledWith('x');
    await fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(onBack).toHaveBeenCalled();
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
