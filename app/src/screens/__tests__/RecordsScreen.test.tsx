import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { RecordRepositoryProvider } from '../../hooks/useRecordRepository';
import { createRecordRepository } from '../../lib/recordRepository';
import type { KeyValueStorage } from '../../lib/storage';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

function memoryRepository() {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return createRecordRepository(storage);
}

const input = {
  kind: 'movie' as const,
  title: '映画A',
  creator: null,
  publisher: null,
  isbn: null,
  coverUrl: null,
  photoUri: null,
  startDate: null,
  endDate: null,
  status: 'in_progress' as const,
  review: null,
  rating: null,
};

beforeEach(() => jest.clearAllMocks());

describe('RecordsScreen', () => {
  it('0 件なら空状態を表示し、追加ボタンで新規フォームへ遷移する', async () => {
    await render(
      <RecordRepositoryProvider repository={memoryRepository()}>
        <RecordsScreen />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('まだ記録がありません')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '追加' }));
    expect(router.push).toHaveBeenCalledWith('/record/new');
    await fireEvent.press(screen.getByRole('button', { name: 'ISBN で探して追加' }));
    expect(router.push).toHaveBeenCalledWith('/record/isbn');
  });

  it('記録を新しい順に表示し、行を押すと編集画面へ遷移する', async () => {
    const repository = memoryRepository();
    await repository.add(input);
    const second = await repository.add({ ...input, title: '本B', kind: 'book' });
    await render(
      <RecordRepositoryProvider repository={repository}>
        <RecordsScreen />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('映画A')).toBeTruthy();
    expect(screen.getByText('映画 ・ 見てる')).toBeTruthy();
    expect(screen.getByText('本 ・ 読んでる')).toBeTruthy();
    await fireEvent.press(screen.getByText('本B'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/record/[id]',
      params: { id: second.id },
    });
  });
});
