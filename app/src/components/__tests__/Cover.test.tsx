import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { makeRecord } from '../../testUtils';
import { Cover } from '../Cover';

describe('Cover', () => {
  it('写真 → 書影 → 文字の表紙の順にフォールバックする', async () => {
    await render(
      <Cover record={makeRecord({ photoUri: 'file://p', coverUrl: 'http://c' })} width={150} />,
    );
    expect(screen.getByLabelText('タイトル').props.source).toEqual({ uri: 'file://p' });
    await fireEvent(screen.getByLabelText('タイトル'), 'error');
    expect(screen.getByLabelText('タイトル').props.source).toEqual({ uri: 'http://c' });
    await fireEvent(screen.getByLabelText('タイトル'), 'error');
    expect(screen.queryByLabelText('タイトル')).toBeNull();
    expect(screen.getByText('タイトル')).toBeTruthy();
  });

  it('画像がなければ文字の表紙', async () => {
    await render(<Cover record={makeRecord()} width={150} />);
    expect(screen.getByTestId('text-cover')).toBeTruthy();
  });

  it('書影のみが失敗すると文字の表紙', async () => {
    await render(<Cover record={makeRecord({ coverUrl: 'http://c' })} width={150} />);
    await fireEvent(screen.getByLabelText('タイトル'), 'error');
    expect(screen.getByTestId('text-cover')).toBeTruthy();
  });

  it('記録が差し替わると失敗数をリセットする', async () => {
    const { rerender } = await render(
      <Cover record={makeRecord({ coverUrl: 'http://a' })} width={150} />,
    );
    await fireEvent(screen.getByLabelText('タイトル'), 'error');
    expect(screen.getByTestId('text-cover')).toBeTruthy();
    await rerender(<Cover record={makeRecord({ coverUrl: 'http://b' })} width={150} />);
    expect(screen.getByLabelText('タイトル').props.source).toEqual({ uri: 'http://b' });
  });

  it.each([56, 150, 196])('幅 %i で高さは 1.5 倍、resizeMode は cover', async (width) => {
    await render(<Cover record={makeRecord({ coverUrl: 'http://c' })} width={width} radius={6} />);
    const image = screen.getByLabelText('タイトル');
    const style = StyleSheet.flatten(image.props.style);
    expect(style.width).toBe(width);
    expect(style.height).toBe(width * 1.5);
    expect(style.borderRadius).toBe(6);
    expect(image.props.resizeMode).toBe('cover');
  });

  it('文字の表紙の高さも幅の 1.5 倍', async () => {
    await render(<Cover record={makeRecord()} width={56} />);
    expect(StyleSheet.flatten(screen.getByTestId('text-cover').props.style).height).toBe(84);
  });
});
