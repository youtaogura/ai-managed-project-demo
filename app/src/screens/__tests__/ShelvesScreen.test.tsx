import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { createRecordRepository } from '../../lib/recordRepository';
import { createShelfRepository, type ShelfRepository } from '../../lib/shelfRepository';
import { withRepository } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import { ShelvesScreen } from '../ShelvesScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.setTimeout(15000);

async function setup(names: string[] = ['SF', '哲学', '詩'], wrap?: (r: ShelfRepository) => ShelfRepository) {
  const shelfStorage = createMemoryStorage();
  const shelfRepository = createShelfRepository(shelfStorage.storage);
  for (const name of names) await shelfRepository.create(name);
  const shelves = await shelfRepository.getAll();
  const recordStorage = createMemoryStorage();
  const recordRepository = createRecordRepository(recordStorage.storage);
  await recordRepository.importRecords(
    [
      makeRecord({ id: 'r1', title: 'A', shelfIds: shelves.slice(0, 2).map((s) => s.id) }),
      makeRecord({ id: 'r2', title: 'B', shelfIds: shelves.slice(0, 1).map((s) => s.id) }),
    ],
    'replace',
  );
  const used = wrap ? wrap(shelfRepository) : shelfRepository;
  await renderRouter({ index: () => withRepository(recordRepository, <ShelvesScreen />, undefined, undefined, used) });
  return { shelfRepository, recordRepository };
}

const names = async (repo: ShelfRepository) => (await repo.getAll()).map((s) => s.name);

describe('ShelvesScreen', () => {
  it('order 順に名前と冊数を出す', async () => {
    await setup();
    expect(await screen.findByText('SF')).toBeTruthy();
    expect(screen.getByText('2 冊')).toBeTruthy();
    expect(screen.getByText('1 冊')).toBeTruthy();
    expect(screen.getByText('0 冊')).toBeTruthy();
    expect(screen.getByText('本棚の管理')).toBeTruthy();
  });

  it('0 件のときは案内と作成ボタンだけを出す', async () => {
    await setup([]);
    expect(await screen.findByText('まだ本棚がありません')).toBeTruthy();
    expect(screen.getByRole('button', { name: '本棚を作る' })).toBeTruthy();
  });

  it('名前を変えると一覧が変わる。自分自身の名前のままは可、重複は不可', async () => {
    const { shelfRepository } = await setup();
    await fireEvent.press(await screen.findByRole('button', { name: 'SFの名前を変える' }));
    const input = await screen.findByLabelText('名前');
    expect(input.props.value).toBe('SF');
    await fireEvent.changeText(input, '哲学');
    await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByText('同じ名前の本棚があります')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('名前'), 'ＳＦ小説');
    await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByText('ＳＦ小説')).toBeTruthy();
    expect(await names(shelfRepository)).toEqual(['ＳＦ小説', '哲学', '詩']);
  });

  it('同じ名前のまま保存できる', async () => {
    await setup();
    await fireEvent.press(await screen.findByRole('button', { name: 'SFの名前を変える' }));
    await fireEvent.press(await screen.findByRole('button', { name: '保存する' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '保存する' })).toBeNull());
  });

  it('上へ・下へで並べ替わり、端のボタンは無効', async () => {
    const { shelfRepository } = await setup();
    await screen.findByText('SF');
    expect(screen.getByRole('button', { name: 'SFを上へ' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: '詩を下へ' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: '詩を上へ' }));
    await waitFor(async () => expect(await names(shelfRepository)).toEqual(['SF', '詩', '哲学']));
    await fireEvent.press(screen.getByRole('button', { name: 'SFを下へ' }));
    await waitFor(async () => expect(await names(shelfRepository)).toEqual(['詩', 'SF', '哲学']));
    await waitFor(() => expect(screen.getByRole('button', { name: '詩を上へ' }).props.accessibilityState.disabled).toBe(true));
  });

  it('並べ替えに失敗したらエラーを出して落ちない', async () => {
    await setup(undefined, (r) => ({ ...r, reorder: () => Promise.reject(new Error('x')) }));
    await fireEvent.press(await screen.findByRole('button', { name: '詩を上へ' }));
    expect(await screen.findByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
  });

  it('削除は確認のシートを出し、キャンセルでは何も変わらない', async () => {
    const { shelfRepository } = await setup();
    await fireEvent.press(await screen.findByRole('button', { name: 'SFを削除' }));
    expect(await screen.findByText('この本棚を削除しますか？')).toBeTruthy();
    expect(screen.getByText('「SF」を削除します。中の本は消えず、「すべての本」には残ります')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(await names(shelfRepository)).toEqual(['SF', '哲学', '詩']);
    expect(screen.queryByText('この本棚を削除しますか？')).toBeNull();
  });

  it('「削除する」で本棚が消え、記録の shelfIds から外れるが本は残る', async () => {
    const { shelfRepository, recordRepository } = await setup();
    const sfId = (await shelfRepository.getAll())[0].id;
    await fireEvent.press(await screen.findByRole('button', { name: 'SFを削除' }));
    await fireEvent.press(await screen.findByRole('button', { name: '削除する' }));
    await waitFor(() => expect(screen.queryByText('SF')).toBeNull());
    expect(await names(shelfRepository)).toEqual(['哲学', '詩']);
    const records = await recordRepository.getAll();
    expect(records).toHaveLength(2);
    expect(records.every((r) => !r.shelfIds.includes(sfId))).toBe(true);
  });

  it('削除に失敗したらシートにエラーを出す', async () => {
    await setup(undefined, (r) => ({ ...r, delete: () => Promise.reject(new Error('x')) }));
    await fireEvent.press(await screen.findByRole('button', { name: 'SFを削除' }));
    await fireEvent.press(await screen.findByRole('button', { name: '削除する' }));
    expect(await screen.findByText('削除できませんでした。もう一度お試しください')).toBeTruthy();
    expect(screen.getByText('SF')).toBeTruthy();
  });

  it('「＋ 本棚を作る」で作れる。同じ名前は作れず、保存失敗は文言を出す', async () => {
    let fail = true;
    const { shelfRepository } = await setup(undefined, (r) => ({
      ...r,
      create: (name) => (fail ? Promise.reject(new Error('x')) : r.create(name)),
    }));
    await fireEvent.press(await screen.findByRole('button', { name: '本棚を作る' }));
    await fireEvent.changeText(await screen.findByLabelText('名前'), 'sf');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByText('同じ名前の本棚があります')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('名前'), '仕事の本');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByText('仕事の本')).toBeTruthy();
    expect(await names(shelfRepository)).toEqual(['SF', '哲学', '詩', '仕事の本']);
    await act(async () => undefined);
  });
});
