import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { StatusTabs } from '../StatusTabs';

const counts = { all: 5, in_progress: 1, completed: 3, planned: 1 };

describe('StatusTabs', () => {
  it('4 つのタブと件数を出し、選択中は selected', async () => {
    await render(<StatusTabs value="completed" counts={counts} onChange={jest.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: '読んだ 3' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('tab', { name: 'すべて 5' }).props.accessibilityState.selected).toBe(false);
  });

  it('押すと onChange に値が渡る', async () => {
    const onChange = jest.fn();
    await render(<StatusTabs value="all" counts={counts} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('tab', { name: '読みたい 1' }));
    expect(onChange).toHaveBeenCalledWith('planned');
  });

  it('タブは左から詰めて並ぶ（均等に引き伸ばさない）', async () => {
    await render(<StatusTabs value="all" counts={counts} onChange={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getByRole('tab', { name: 'すべて 5' }).props.style);
    expect(style.flex).toBeUndefined();
  });
});
