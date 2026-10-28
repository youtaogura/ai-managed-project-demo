import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { Quote } from '../Quote';

const quote = { id: 'q', text: '吾輩は猫である', page: '142', comment: '好き', createdAt: '2024-01-01T00:00:00.000Z' };

describe('Quote', () => {
  it('朱の線・本文・ページ・ひとことを出す', async () => {
    await render(<Quote quote={quote} />);
    expect(screen.getByTestId('quote-line')).toBeTruthy();
    expect(screen.getByText('吾輩は猫である')).toBeTruthy();
    expect(screen.getByText('p.142')).toBeTruthy();
    expect(screen.getByText('好き')).toBeTruthy();
  });

  it('ページ・ひとことがなければ出さない', async () => {
    await render(<Quote quote={{ ...quote, page: null, comment: null }} />);
    expect(screen.queryByText(/^p\./)).toBeNull();
    expect(screen.queryByText('好き')).toBeNull();
  });

  it('書き出しがあれば本文の上に出す', async () => {
    await render(<Quote quote={{ ...quote, starter: '好きなのは、' }} />);
    const starter = screen.getByText('好きなのは、');
    expect(starter).toBeTruthy();
    // 書き出しは朱で、本文（引用）の前に出る
    expect(StyleSheet.flatten(starter.props.style).color).toBe(colors.ribbon);
    expect(screen.getByTestId('quote-starter')).toBeTruthy();
  });

  it('書き出しがなければ出さない', async () => {
    await render(<Quote quote={{ ...quote, starter: null }} />);
    expect(screen.queryByText('好きなのは、')).toBeNull();
  });

  it('タップすると onPress が呼ばれる', async () => {
    const onPress = jest.fn();
    await render(<Quote quote={quote} onPress={onPress} />);
    await fireEvent.press(screen.getByText('吾輩は猫である'));
    expect(onPress).toHaveBeenCalledWith(quote);
  });
});
