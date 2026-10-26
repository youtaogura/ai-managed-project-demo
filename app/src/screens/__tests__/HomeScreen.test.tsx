import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '../HomeScreen';

describe('HomeScreen', () => {
  it('タイトルを表示する', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('AI Managed Project Demo')).toBeTruthy();
  });
});
