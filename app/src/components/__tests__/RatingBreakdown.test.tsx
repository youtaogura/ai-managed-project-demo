import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { RatingBreakdown } from '../RatingBreakdown';

const bg = (label: string) => StyleSheet.flatten(screen.getByTestId(`rating-bar-${label}`).props.style);

describe('RatingBreakdown', () => {
  it('4 区分を順に並べ、いちばん多い区分だけ墨にする', async () => {
    await render(
      <RatingBreakdown
        buckets={[
          { label: '最高', count: 1 },
          { label: 'よかった', count: 4 },
          { label: 'まあまあ', count: 2 },
          { label: 'あんまり', count: 0 },
        ]}
      />,
    );
    const labels = ['最高', 'よかった', 'まあまあ', 'あんまり'].map((l) => screen.getByText(l));
    expect(labels).toHaveLength(4);
    expect(bg('よかった').backgroundColor).toBe(colors.textPrimary);
    expect(bg('最高').backgroundColor).toBe(colors.textTertiary);
    expect(bg('よかった').width).toBe('100%');
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('最大が 0 のときは全部 textTertiary', async () => {
    await render(<RatingBreakdown buckets={[{ label: '最高', count: 0 }, { label: 'あんまり', count: 0 }]} />);
    expect(bg('最高').backgroundColor).toBe(colors.textTertiary);
    expect(bg('あんまり').backgroundColor).toBe(colors.textTertiary);
    expect(bg('最高').width).toBe('0%');
  });
});
