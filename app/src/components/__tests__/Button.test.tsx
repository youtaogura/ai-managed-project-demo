import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, size } from '../../design/tokens';
import { Button, pressedStyle } from '../Button';

function flat(node: { props: { style?: unknown } }, pressed = false) {
  const style = node.props.style;
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return StyleSheet.flatten(resolved as never) as Record<string, unknown>;
}

describe('Button', () => {
  it('主ボタンは accent 面・accentInk 文字で押すと onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="保存" onPress={onPress} />);
    const b = screen.getByRole('button', { name: '保存' });
    const s = flat(b);
    expect(s.backgroundColor).toBe(colors.accent);
    expect(s.height).toBe(size.buttonHeight);
    expect(s.borderRadius).toBe(radius.button);
    expect(StyleSheet.flatten(screen.getByText('保存').props.style).color).toBe(colors.accentInk);
    await fireEvent.press(b);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('枠ボタンは lineStrong 枠、danger は danger 色', async () => {
    await render(
      <>
        <Button variant="outline" label="戻る" onPress={jest.fn()} />
        <Button variant="outline" tone="danger" label="削除" onPress={jest.fn()} />
      </>,
    );
    const normal = flat(screen.getByRole('button', { name: '戻る' }));
    expect(normal.borderColor).toBe(colors.lineStrong);
    expect(normal.backgroundColor).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByText('戻る').props.style).color).toBe(colors.textPrimary);
    const danger = flat(screen.getByRole('button', { name: '削除' }));
    expect(danger.borderColor).toBe(colors.danger);
    expect(StyleSheet.flatten(screen.getByText('削除').props.style).color).toBe(colors.danger);
  });

  it('アイコンボタンは円で surface2、onImage で scrim', async () => {
    await render(
      <>
        <Button variant="icon" accessibilityLabel="戻る" onPress={jest.fn()}>
          {null}
        </Button>
        <Button variant="icon" onImage accessibilityLabel="カメラ" onPress={jest.fn()}>
          {null}
        </Button>
      </>,
    );
    const a = flat(screen.getByLabelText('戻る'));
    expect(a.backgroundColor).toBe(colors.surface2);
    expect(a.width).toBe(size.touchMin);
    expect(a.borderRadius).toBe(radius.full);
    expect(flat(screen.getByLabelText('カメラ')).backgroundColor).toBe(colors.scrim);
  });

  it('記録ボタンは「記録する」ラベルで＋を表示する', async () => {
    const onPress = jest.fn();
    await render(<Button variant="record" onPress={onPress} />);
    expect(screen.getByText('＋')).toBeTruthy();
    const b = screen.getByLabelText('記録する');
    expect(flat(b).backgroundColor).toBe(colors.accent);
    await fireEvent.press(b);
    expect(onPress).toHaveBeenCalled();
  });

  it('disabled では押せない', async () => {
    const onPress = jest.fn();
    await render(<Button label="保存" disabled onPress={onPress} />);
    const b = screen.getByRole('button', { name: '保存' });
    expect(b.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(b);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('押下中は opacity 0.8・scale 0.97', async () => {
    const s = pressedStyle;
    expect(s.opacity).toBe(0.8);
    expect(s.transform).toEqual([{ scale: 0.97 }]);
  });
});
