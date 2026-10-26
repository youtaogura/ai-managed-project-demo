import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { withRepository } from '../../testProviders';
import { createRecordRepository } from '../../lib/recordRepository';
import type { KeyValueStorage } from '../../lib/storage';
import { RecordFormScreen } from '../RecordFormScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() } }));

function memoryRepository() {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return createRecordRepository(storage);
}

const baseInput = {
  kind: 'book' as const,
  title: '既存',
  creator: '作者',
  publisher: null,
  isbn: null,
  coverUrl: 'http://cover',
  photoUri: 'file://photo',
  startDate: null,
  endDate: null,
  status: 'planned' as const,
  review: null,
  rating: null,
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// 初回レンダリングが CI の遅い環境で 5 秒を超えることがあるため延長する
jest.setTimeout(30000);

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('RecordFormScreen（新規）', () => {
  it('保存で add が呼ばれ、保存した記録の詳細へ移る', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(
      withRepository(repository, <RecordFormScreen />),
    );
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '新しい本');
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [created] = await repository.getAll();
    expect(router.replace).toHaveBeenCalledWith('/records/' + created?.id);
    expect(router.back).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新しい本', status: 'planned' }),
    );
    expect(await repository.getAll()).toHaveLength(1);
  });

  it('タイトルが空なら add は呼ばれない', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(
      withRepository(repository, <RecordFormScreen />),
    );
    await press('記録する');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(add).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('初期値が入力済みになり、書影 URL が保存される', async () => {
    const repository = memoryRepository();
    await render(
      withRepository(repository, <RecordFormScreen initialValues={{ title: '検索結果', coverUrl: 'http://c' }} />),
    );
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('検索結果');
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.coverUrl).toBe('http://c');
  });

  it('add が失敗したら画面に留まり失敗メッセージを表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'add').mockRejectedValue(new Error('x'));
    await render(
      withRepository(repository, <RecordFormScreen initialValues={{ title: 'a' }} />),
    );
    await press('記録する');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RecordFormScreen（編集）', () => {
  const setup = async () => {
    const repository = memoryRepository();
    const record = await repository.add(baseInput);
    await render(
      withRepository(repository, <RecordFormScreen recordId={record.id} />),
    );
    return { repository, record };
  };

  it('既存値が入力済みで開き、保存で update が呼ばれ coverUrl / photoUri が維持される', async () => {
    const { repository, record } = await setup();
    expect(await screen.findByDisplayValue('既存')).toBeTruthy();
    const update = jest.spyOn(repository, 'update');
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '変更後');
    await press('保存する');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(record.id, expect.objectContaining({ title: '変更後' }));
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({ coverUrl: 'http://cover', photoUri: 'file://photo' });
  });

  it('存在しない id では「記録が見つかりません」を表示する', async () => {
    await render(
      withRepository(memoryRepository(), <RecordFormScreen recordId="none" />),
    );
    expect(await screen.findByText('記録が見つかりません')).toBeTruthy();
  });

  it('読み込みに失敗しても「記録が見つかりません」を表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'getAll').mockRejectedValue(new Error('x'));
    await render(
      withRepository(repository, <RecordFormScreen recordId="1" />),
    );
    expect(await screen.findByText('記録が見つかりません')).toBeTruthy();
  });

  it('保存時に記録が消えていたら失敗メッセージを表示する', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    await repository.delete(record.id);
    await press('保存する');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('削除を確定すると delete が呼ばれ一覧へ移る', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    const del = jest.spyOn(repository, 'delete');
    await press('この記録を削除');
    expect(screen.getByText('この記録を削除しますか？')).toBeTruthy();
    await press('削除する');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(del).toHaveBeenCalledWith(record.id);
    expect(await repository.getAll()).toHaveLength(0);
  });

  it('キャンセルでは delete は呼ばれず画面に留まる', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    const del = jest.spyOn(repository, 'delete');
    await press('この記録を削除');
    await press('キャンセル');
    expect(del).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('delete が失敗したら失敗メッセージを表示する', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('x'));
    await press('この記録を削除');
    await press('削除する');
    expect(await screen.findByText('削除に失敗しました')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
