import { fireEvent, render, screen } from '@testing-library/react-native';

import { HeroCriterionSheet } from '../HeroCriterionSheet';

describe('HeroCriterionSheet', () => {
  it('5 つの選択肢と補足を出し、選択中は selected になる', async () => {
    await render(
      <HeroCriterionSheet visible value="highRated" onClose={jest.fn()} onChange={jest.fn()} />,
    );
    expect(screen.getByText('上に大きく出す作品')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByText('レーティング 4.0 以上を高い順')).toBeTruthy();
    expect(screen.getByText('終えた日の新しい順')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '評価の高い作品' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByRole('radio', { name: '表示しない' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('選択肢をタップすると onChange に条件を渡す', async () => {
    const onChange = jest.fn();
    await render(<HeroCriterionSheet visible value="recent" onClose={jest.fn()} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: '表示しない' }));
    expect(onChange).toHaveBeenCalledWith('none');
  });
});
