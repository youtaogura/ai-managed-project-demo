import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius } from '../../design/tokens';
import { Hint } from '../Hint';

const HINT = 'いちばん心に残ったのは、';

describe('Hint', () => {
  it('まだ入れていないヒントは「＋」、丸い surface-1 の面に line の枠', async () => {
    await render(<Hint text={HINT} used={false} onPress={() => undefined} />);
    const button = screen.getByRole('button', { name: HINT });
    expect(within(button).getByText('＋')).toBeTruthy();
    const style = StyleSheet.flatten(button.props.style);
    expect(style).toMatchObject({ backgroundColor: colors.surface1, borderColor: colors.line, borderRadius: radius.full });
  });

  it('入れたヒントは surface-2 と「✓」。押すと onPress', async () => {
    const onPress = jest.fn();
    await render(<Hint text={HINT} used onPress={onPress} />);
    const button = screen.getByRole('button', { name: HINT });
    expect(within(button).getByText('✓')).toBeTruthy();
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(colors.surface2);
    expect(button.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
