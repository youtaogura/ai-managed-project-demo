import { render, screen } from '@testing-library/react-native';

import { RibbonMark } from '../RibbonMark';

describe('RibbonMark', () => {
  it('下の切り欠き（左右の三角）の要素を描く', async () => {
    await render(<RibbonMark testID="mark" />);
    expect(screen.getByTestId('mark')).toBeTruthy();
    expect(screen.getAllByTestId('ribbon-notch')).toHaveLength(2);
  });
});
