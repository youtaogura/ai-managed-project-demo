import { render, screen } from '@testing-library/react-native';

import { AnalyticsScreen } from '../AnalyticsScreen';
import { RecordsScreen } from '../RecordsScreen';

describe('RecordsScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(<RecordsScreen />);
    expect(screen.getByText('まだ記録がありません')).toBeTruthy();
    expect(screen.getByText('記録を追加するとここに表示されます')).toBeTruthy();
  });
});

describe('AnalyticsScreen', () => {
  it('空状態の文言を表示する', async () => {
    await render(<AnalyticsScreen />);
    expect(screen.getByText('分析できる記録がまだありません')).toBeTruthy();
  });
});
