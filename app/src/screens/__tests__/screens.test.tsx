import { render, screen } from '@testing-library/react-native';

import { RecordRepositoryProvider } from '../../hooks/useRecordRepository';
import { createRecordRepository } from '../../lib/recordRepository';
import { AnalyticsScreen } from '../AnalyticsScreen';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
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
    expect(await screen.findByText('まだ記録がありません')).toBeTruthy();
    expect(screen.getByText('記録を追加するとここに表示されます')).toBeTruthy();
  });
});

describe('AnalyticsScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(<AnalyticsScreen />);
    expect(screen.getByText('分析できる記録がまだありません')).toBeTruthy();
  });
});
