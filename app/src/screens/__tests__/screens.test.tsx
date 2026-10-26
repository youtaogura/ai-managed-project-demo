import { render, screen } from '@testing-library/react-native';
import { renderRouter, waitFor } from 'expo-router/testing-library';

import { AnalyticsScreen } from '../AnalyticsScreen';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('RecordsScreen', () => {
  it('空状態の文言を表示する', async () => {
    await renderRouter({ index: () => <RecordsScreen /> });
    await waitFor(() => expect(screen.getByText('まだ記録がありません')).toBeTruthy());
    expect(screen.getByText('記録を追加するとここに表示されます')).toBeTruthy();
  });
});

describe('AnalyticsScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(<AnalyticsScreen />);
    expect(screen.getByText('分析できる記録がまだありません')).toBeTruthy();
  });
});
