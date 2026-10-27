import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { DateFieldButton, TextField } from '../TextField';

describe('TextField', () => {
  it('見出しを入力欄のラベルにし、必須・任意を付ける', async () => {
    await render(
      <>
        <TextField label="タイトル" required value="" onChangeText={jest.fn()} />
        <TextField label="メモ" optionalLabel value="" onChangeText={jest.fn()} />
      </>,
    );
    expect(screen.getByText('タイトル（必須）')).toBeTruthy();
    expect(screen.getByLabelText('タイトル（必須）')).toBeTruthy();
    expect(screen.getByLabelText('メモ（任意）')).toBeTruthy();
  });

  it('見た目・フォーカス・onChangeText・props 透過', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextField label="作者" value="" onChangeText={onChangeText} placeholder="入力" maxLength={5} />,
    );
    const input = screen.getByLabelText('作者');
    let s = StyleSheet.flatten(input.props.style);
    expect(s.backgroundColor).toBe(colors.surface2);
    expect(s.borderColor).toBe(colors.line);
    expect(s.height).toBe(48);
    expect(input.props.placeholderTextColor).toBe(colors.textTertiary);
    expect(input.props.maxLength).toBe(5);
    await fireEvent(input, 'focus');
    expect(StyleSheet.flatten(screen.getByLabelText('作者').props.style).borderColor).toBe(colors.accent);
    await fireEvent(input, 'blur');
    s = StyleSheet.flatten(screen.getByLabelText('作者').props.style);
    expect(s.borderColor).toBe(colors.line);
    await fireEvent.changeText(input, 'x');
    expect(onChangeText).toHaveBeenCalledWith('x');
  });

  it('error は danger で表示され、フォーカスより優先される', async () => {
    await render(<TextField label="作者" value="" onChangeText={jest.fn()} error="入力してください" />);
    const input = screen.getByLabelText('作者');
    await fireEvent(input, 'focus');
    expect(StyleSheet.flatten(screen.getByLabelText('作者').props.style).borderColor).toBe(colors.danger);
    expect(StyleSheet.flatten(screen.getByText('入力してください').props.style).color).toBe(colors.danger);
  });

  it('multiline は最小高さ 120', async () => {
    await render(<TextField label="感想" multiline value="" onChangeText={jest.fn()} />);
    const input = screen.getByLabelText('感想');
    expect(StyleSheet.flatten(input.props.style).minHeight).toBe(120);
    expect(input.props.textAlignVertical).toBe('top');
  });

  it('isbn は高さ 56・22 太字・数字キーボード', async () => {
    await render(<TextField label="ISBN" variant="isbn" value="" onChangeText={jest.fn()} />);
    const input = screen.getByLabelText('ISBN');
    const s = StyleSheet.flatten(input.props.style);
    expect(s.height).toBe(56);
    expect(s.fontSize).toBe(22);
    expect(s.fontWeight).toBe('700');
    expect(input.props.keyboardType).toBe('numbers-and-punctuation');
  });

  it('確定キーの onSubmitEditing と returnKeyType をそのまま渡す', async () => {
    const onSubmitEditing = jest.fn();
    await render(
      <TextField label="ISBN" variant="isbn" returnKeyType="search" onSubmitEditing={onSubmitEditing} />,
    );
    const input = screen.getByLabelText('ISBN');
    expect(input.props.returnKeyType).toBe('search');
    await fireEvent(input, 'submitEditing');
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });
});

describe('DateFieldButton', () => {
  it('値があれば値、なければ「選択してください」', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <DateFieldButton label="開始日" value="2026-01-02" onPress={onPress} />
        <DateFieldButton label="終了日" onPress={jest.fn()} error="エラー" />
      </>,
    );
    const a = screen.getByRole('button', { name: '開始日 2026-01-02' });
    await fireEvent.press(a);
    expect(onPress).toHaveBeenCalled();
    expect(StyleSheet.flatten(screen.getByText('2026-01-02').props.style).color).toBe(colors.textPrimary);
    expect(screen.getByRole('button', { name: '終了日 選択してください' })).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('選択してください').props.style).color).toBe(
      colors.textTertiary,
    );
    expect(screen.getByText('エラー')).toBeTruthy();
  });
});
