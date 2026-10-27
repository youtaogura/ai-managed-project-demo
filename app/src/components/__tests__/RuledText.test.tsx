import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { colors } from '../../design/tokens';
import { RuledText } from '../RuledText';

describe('RuledText', () => {
  it('行数ぶんの罫線を colors.line で 32px ごとに引く', async () => {
    await render(
      <RuledText>
        <Text>本文</Text>
      </RuledText>,
    );
    expect(screen.getAllByTestId('rule')).toHaveLength(1);
    await fireEvent(screen.getByText('本文').parent ?? screen.getByText('本文'), 'layout', {
      nativeEvent: { layout: { height: 96 } },
    });
    const rules = screen.getAllByTestId('rule');
    expect(rules).toHaveLength(3);
    const style = StyleSheet.flatten(rules[1].props.style);
    expect(style.top).toBe(63);
    expect(style.backgroundColor).toBe(colors.line);
  });
});
