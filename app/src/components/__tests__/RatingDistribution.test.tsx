import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { RatingDistribution } from '../RatingDistribution';

const bg = (bucket: number) =>
  StyleSheet.flatten(screen.getByTestId(`rating-bar-${bucket}`).props.style).backgroundColor;

describe('RatingDistribution', () => {
  it('1 点台が上に並び、件数が出る', async () => {
    await render(<RatingDistribution distribution={{ 1: 1, 2: 0, 3: 2, 4: 5, 5: 3 }} />);
    expect(screen.getByText('1点台')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    const labels = screen.getAllByText(/点台/).map((n) => n.props.children);
    expect(labels).toEqual(['1点台', '2点台', '3点台', '4点台', '5点台']);
  });

  it('最も多い段だけ accent、他は灰色', async () => {
    await render(<RatingDistribution distribution={{ 1: 1, 2: 0, 3: 2, 4: 5, 5: 3 }} />);
    expect(bg(4)).toBe(colors.accent);
    for (const b of [1, 2, 3, 5]) expect(bg(b)).toBe(colors.textTertiary);
  });

  it('全部 0 件ならどの段も白にしない', async () => {
    await render(<RatingDistribution distribution={{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }} />);
    for (const b of [1, 2, 3, 4, 5]) expect(bg(b)).toBe(colors.textTertiary);
  });
});
