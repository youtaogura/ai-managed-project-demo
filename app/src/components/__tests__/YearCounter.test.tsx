import { render, screen } from '@testing-library/react-native';

import { YearCounter } from '../YearCounter';

describe('YearCounter', () => {
  it('今年の作品数と今月の数を表示する', async () => {
    await render(<YearCounter year={48} month={6} />);
    expect(screen.getByText('今年')).toBeTruthy();
    expect(screen.getByText('48')).toBeTruthy();
    expect(screen.getByText('作品 · 今月 6')).toBeTruthy();
    expect(screen.getByLabelText('今年 48 作品 · 今月 6')).toBeTruthy();
  });
});
