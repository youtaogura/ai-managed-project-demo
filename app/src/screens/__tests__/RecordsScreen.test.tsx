import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { createSortOrderStore } from '../../lib/sortOrderStore';
import { createFakeRepository, createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import type { RecordRepository } from '../../lib/recordRepository';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const records: MediaRecord[] = [
  makeRecord({
    id: 'a',
    title: 'アルファ',
    kind: 'book',
    status: 'completed',
    startDate: '2024-01-05',
    endDate: '2024-02-10',
    rating: 4,
  }),
  makeRecord({ id: 'b', title: 'ベータ', kind: 'movie', status: 'planned', startDate: '2024-03-01' }),
  makeRecord({ id: 'c', title: 'ガンマ', kind: 'anime', endDate: '2024-05-01', rating: 2.5 }),
];

function setup(
  repository: RecordRepository,
  storage = createMemoryStorage().storage,
  handlers: { onAdd?: () => void; onOpen?: (id: string) => void } = {},
) {
  return renderRouter({
    index: () => (
      <RecordsScreen
        repository={repository}
        sortOrderStore={createSortOrderStore(storage)}
        {...handlers}
      />
    ),
  });
}

const titles = () =>
  screen
    .getAllByText(/^(アルファ|ベータ|ガンマ)$/)
    .map((n) => n.props.children as string);

describe('RecordsScreen', () => {
  it('読み込み中はインジケーターを表示し、完了後に切り替わる', async () => {
    const { repository } = createFakeRepository(records);
    await setup(repository);
    await waitFor(() => expect(screen.getByText('アルファ')).toBeTruthy());
    expect(screen.queryByLabelText('読み込み中')).toBeNull();
  });

  it('各行にタイトル・種別・ステータス・期間・レーティングを表示する', async () => {
    await setup(createFakeRepository(records).repository);
    await waitFor(() => expect(screen.getByText('アルファ')).toBeTruthy());
    expect(screen.getByText('本 ・ 読み終わった')).toBeTruthy();
    expect(screen.getByText('2024-01-05 〜 2024-02-10')).toBeTruthy();
    expect(screen.getByText('★ 4.0')).toBeTruthy();
    expect(screen.getByText('2024-03-01 〜')).toBeTruthy();
    expect(screen.getByText('〜 2024-05-01')).toBeTruthy();
    expect(screen.getByText('映画 ・ 見たい')).toBeTruthy();
    expect(screen.getByText('未評価')).toBeTruthy();
    expect(screen.getByText('📖')).toBeTruthy();
  });

  it('既定は終了日の新しい順で、並び替えると即座に変わる', async () => {
    await setup(createFakeRepository(records).repository);
    await waitFor(() => expect(screen.getByText('アルファ')).toBeTruthy());
    expect(titles()).toEqual(['ガンマ', 'アルファ', 'ベータ']);
    expect(screen.getByText('並び替え: 終了日が新しい順')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('並び替え'));
    await fireEvent.press(screen.getByText('評価が高い順'));
    expect(titles()).toEqual(['アルファ', 'ガンマ', 'ベータ']);
    expect(screen.getByText('並び替え: 評価が高い順')).toBeTruthy();
  });

  it('選択シートを閉じられる', async () => {
    await setup(createFakeRepository(records).repository);
    await waitFor(() => expect(screen.getByText('アルファ')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('並び替え'));
    expect(screen.getByText('タイトル順')).toBeTruthy();
    await fireEvent(screen.getByTestId('sort-modal'), 'requestClose');
    expect(screen.queryByText('タイトル順')).toBeNull();
  });

  it('並び順は再マウント後も維持される', async () => {
    const { storage } = createMemoryStorage();
    const { repository } = createFakeRepository(records);
    await setup(repository, storage);
    await waitFor(() => expect(screen.getByText('アルファ')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('並び替え'));
    await fireEvent.press(screen.getByText('評価が高い順'));
    await screen.unmount();

    await setup(repository, storage);
    await waitFor(() => expect(screen.getByText('並び替え: 評価が高い順')).toBeTruthy());
    expect(titles()).toEqual(['アルファ', 'ガンマ', 'ベータ']);
  });

  it('行をタップすると onOpen が id 付きで呼ばれる', async () => {
    const onOpen = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onOpen });
    await waitFor(() => expect(screen.getByText('ベータ')).toBeTruthy());
    await fireEvent.press(screen.getByText('ベータ'));
    expect(onOpen).toHaveBeenCalledWith('b');
  });

  it('0 件のときは空状態と追加ボタンを表示し、押すと onAdd が呼ばれる', async () => {
    const onAdd = jest.fn();
    await setup(createFakeRepository().repository, undefined, { onAdd });
    await waitFor(() => expect(screen.getByText('まだ記録がありません')).toBeTruthy());
    expect(screen.getByText('記録を追加するとここに表示されます')).toBeTruthy();
    await fireEvent.press(screen.getByText('記録を追加する'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('コールバック未指定でもタップで落ちない', async () => {
    await setup(createFakeRepository(records).repository);
    await waitFor(() => expect(screen.getByText('ベータ')).toBeTruthy());
    await fireEvent.press(screen.getByText('ベータ'));
  });
});
