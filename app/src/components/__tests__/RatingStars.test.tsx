import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { RatingStars } from '../RatingStars';

const fillWidth = (i: number) =>
  StyleSheet.flatten(screen.getByTestId(`rating-star-fill-${i}`, { hidden: true }).props.style).width;

describe('RatingStars', () => {
  it('4.2 は 4 つ満たし 5 つ目を 20% 塗る', async () => {
    await render(<RatingStars rating={4.2} size={10} />);
    expect([0, 1, 2, 3, 4].map(fillWidth)).toEqual([10, 10, 10, 10, 2]);
    expect(screen.getByText('4.2')).toBeTruthy();
    expect(screen.getByRole('image', { name: 'レーティング 4.2' })).toBeTruthy();
  });

  it('null は塗りなしで「未評価」を出す', async () => {
    await render(<RatingStars rating={null} />);
    expect([0, 1, 2, 3, 4].map(fillWidth)).toEqual([0, 0, 0, 0, 0]);
    expect(screen.getByText('未評価')).toBeTruthy();
    expect(screen.getByRole('image', { name: 'レーティング 未評価' })).toBeTruthy();
  });

  it('塗りは accent、未到達は starOff', async () => {
    await render(<RatingStars rating={3} />);
    const filled = screen.getAllByText('★', { hidden: true });
    const colorsUsed = filled.map((n) => StyleSheet.flatten(n.props.style).color);
    expect(colorsUsed).toContain(colors.accent);
    expect(colorsUsed).toContain(colors.starOff);
  });

  it('showValue=false では数字を出さない', async () => {
    await render(<RatingStars rating={4.2} showValue={false} valueVariant="displayNumber" />);
    expect(screen.queryByText('4.2')).toBeNull();
  });

  it('displayNumber で数字を出せる', async () => {
    await render(<RatingStars rating={4.2} valueVariant="displayNumber" />);
    expect(screen.getByText('4.2')).toBeTruthy();
  });
});
