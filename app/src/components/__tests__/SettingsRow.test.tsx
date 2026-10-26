import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { size } from '../../design/tokens';
import { SettingsRow } from '../SettingsRow';

describe('SettingsRow', () => {
  it('ボタンとして、項目名と値を読み上げ、押すと onPress が呼ばれる', async () => {
    const onPress = jest.fn();
    await render(<SettingsRow label="書き出し" value="オフ" onPress={onPress} />);
    const row = screen.getByRole('button', { name: '書き出し、オフ' });
    expect(StyleSheet.flatten(row.props.style).minHeight).toBeGreaterThanOrEqual(size.touchMin);
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('値がなければ 2 行目を出さず、項目名だけを読み上げる', async () => {
    await render(<SettingsRow label="このアプリについて" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'このアプリについて' })).toBeTruthy();
  });
});
