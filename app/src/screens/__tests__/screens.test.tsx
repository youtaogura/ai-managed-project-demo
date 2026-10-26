import { render, screen } from '@testing-library/react-native';

import { RecordRepositoryProvider } from '../../hooks/useRecordRepository';
import { createRecordRepository } from '../../lib/recordRepository';
import { ReviewScreen } from '../ReviewScreen';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useScrollToTop: jest.fn(),
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const emptyRepository = createRecordRepository({
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
});

describe('RecordsScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(
      <RecordRepositoryProvider repository={emptyRepository}>
        <RecordsScreen />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('最初の1冊を、棚に並べよう')).toBeTruthy();
    expect(screen.getByText('読みたい本も、読んだ本も、ここに並んでいきます')).toBeTruthy();
  });
});

describe('ReviewScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(
      <RecordRepositoryProvider repository={emptyRepository}>
        <ReviewScreen />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('読んだ本がたまると、ここに積み上がります')).toBeTruthy();
  });
});
