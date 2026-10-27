import { fireEvent, render, screen } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { MemoRow } from '../MemoRow';

const memo = { id: 'a', text: '気づいたこと', page: '88', createdAt: '2024-01-01T00:00:00.000Z' };

describe('MemoRow', () => {
  it('左にページ、右に本文を出す', async () => {
    await render(<MemoRow memo={memo} />);
    expect(screen.getByText('p.88')).toBeTruthy();
    expect(screen.getByText('気づいたこと')).toBeTruthy();
    expect(screen.queryByTestId('quote-line')).toBeNull();
  });

  it('ページがなければ「—」', async () => {
    await render(<MemoRow memo={{ ...memo, page: null }} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('textColor を渡すと本文の色が変わり、渡さなければ textSecondary にならない', async () => {
    const { rerender } = await render(<MemoRow memo={memo} />);
    expect(StyleSheet.flatten(screen.getByText('気づいたこと').props.style).color).not.toBe(colors.textSecondary);
    await rerender(<MemoRow memo={memo} textColor={colors.textSecondary} />);
    expect(StyleSheet.flatten(screen.getByText('気づいたこと').props.style).color).toBe(colors.textSecondary);
  });

  it('タップすると onPress が呼ばれる', async () => {
    const onPress = jest.fn();
    await render(<MemoRow memo={memo} onPress={onPress} />);
    await fireEvent.press(screen.getByText('気づいたこと'));
    expect(onPress).toHaveBeenCalledWith(memo);
  });
});
