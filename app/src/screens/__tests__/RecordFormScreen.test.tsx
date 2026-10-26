import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import { RecordRepositoryProvider } from '../../hooks/useRecordRepository';
import { createRecordRepository } from '../../lib/recordRepository';
import type { KeyValueStorage } from '../../lib/storage';
import { RecordFormScreen } from '../RecordFormScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

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
  it('保存で add が呼ばれ、前の画面へ戻る', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordFormScreen />
      </RecordRepositoryProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('タイトル'), '新しい本');
    await press('保存');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新しい本', status: 'planned' }),
    );
    expect(await repository.getAll()).toHaveLength(1);
  });

  it('タイトルが空なら add は呼ばれない', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordFormScreen />
      </RecordRepositoryProvider>,
    );
    await press('保存');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(add).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('初期値が入力済みになり、書影 URL が保存される', async () => {
    const repository = memoryRepository();
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordFormScreen initialValues={{ title: '検索結果', coverUrl: 'http://c' }} />
      </RecordRepositoryProvider>,
    );
    expect(screen.getByLabelText('タイトル').props.value).toBe('検索結果');
    await press('保存');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.coverUrl).toBe('http://c');
  });

  it('add が失敗したら画面に留まり失敗メッセージを表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'add').mockRejectedValue(new Error('x'));
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordFormScreen initialValues={{ title: 'a' }} />
      </RecordRepositoryProvider>,
    );
    await press('保存');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('RecordFormScreen（編集）', () => {
  const setup = async () => {
    const repository = memoryRepository();
    const record = await repository.add(baseInput);
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordFormScreen recordId={record.id} />
      </RecordRepositoryProvider>,
    );
    return { repository, record };
  };

  it('既存値が入力済みで開き、保存で update が呼ばれ coverUrl / photoUri が維持される', async () => {
    const { repository, record } = await setup();
    expect(await screen.findByDisplayValue('既存')).toBeTruthy();
    const update = jest.spyOn(repository, 'update');
    await fireEvent.changeText(screen.getByLabelText('タイトル'), '変更後');
    await press('保存');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(record.id, expect.objectContaining({ title: '変更後' }));
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({ coverUrl: 'http://cover', photoUri: 'file://photo' });
  });

  it('存在しない id では「記録が見つかりません」を表示する', async () => {
    await render(
      <RecordRepositoryProvider repository={memoryRepository()}>
        <RecordFormScreen recordId="none" />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('記録が見つかりません')).toBeTruthy();
  });

  it('読み込みに失敗しても「記録が見つかりません」を表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'getAll').mockRejectedValue(new Error('x'));
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordFormScreen recordId="1" />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('記録が見つかりません')).toBeTruthy();
  });

  it('保存時に記録が消えていたら失敗メッセージを表示する', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    await repository.delete(record.id);
    await press('保存');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('削除を確定すると delete が呼ばれ前の画面へ戻る', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const del = jest.spyOn(repository, 'delete');
    await press('削除');
    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    await act(async () => {
      buttons.find((b) => b.text === '削除')?.onPress?.();
    });
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith(record.id);
    expect(await repository.getAll()).toHaveLength(0);
  });

  it('キャンセルでは delete は呼ばれず画面に留まる', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const del = jest.spyOn(repository, 'delete');
    await press('削除');
    expect(alert).toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});
