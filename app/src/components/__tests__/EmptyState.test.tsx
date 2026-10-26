import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('タイトルと補足を表示する', async () => {
    await render(<EmptyState title="タイトル" description="補足" />);
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.getByText('補足')).toBeTruthy();
  });

  it('補足がなければタイトルのみ表示する', async () => {
    await render(<EmptyState title="タイトル" />);
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.queryByText('補足')).toBeNull();
  });

  it('onAction があれば主ボタンと書影から呼べる', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="t" onAction={onAction} />);
    const buttons = screen.getAllByRole('button', { name: '記録する' });
    expect(buttons).toHaveLength(2);
    for (const b of buttons) await fireEvent.press(b);
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('actionLabel を変えられる', async () => {
    await render(<EmptyState title="t" actionLabel="振り返る" onAction={jest.fn()} />);
    expect(screen.getByText('振り返る')).toBeTruthy();
  });

  it('children があれば主ボタンの代わりに描画する', async () => {
    await render(
      <EmptyState title="t" onAction={jest.fn()}>
        <Text>独自</Text>
      </EmptyState>,
    );
    expect(screen.getByText('独自')).toBeTruthy();
    expect(screen.queryByText('記録する')).toBeNull();
  });

  it('onAction がなければボタンを出さない', async () => {
    await render(<EmptyState title="t" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
