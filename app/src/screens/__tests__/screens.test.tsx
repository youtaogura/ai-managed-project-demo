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
    expect(await screen.findByText('最初の1作品を記録しよう')).toBeTruthy();
    expect(screen.getByText('読み終えた本や、見終えた映画を記録するとここに並んでいきます')).toBeTruthy();
  });
});

describe('ReviewScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(
      <RecordRepositoryProvider repository={emptyRepository}>
        <ReviewScreen />
      </RecordRepositoryProvider>,
    );
    expect(await screen.findByText('記録がたまると、ここに振り返りが表示されます')).toBeTruthy();
  });
});
