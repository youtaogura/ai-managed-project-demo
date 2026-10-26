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

  it('点線の空の背表紙が並ぶ', async () => {
    await render(<EmptyState title="t" />);
    expect(screen.getAllByTestId('empty-spine').length).toBeGreaterThanOrEqual(5);
  });

  it('onAction があれば既定の「本を追加する」ボタンだけが出て、押すと呼ばれる', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="t" onAction={onAction} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(screen.getByRole('button', { name: '本を追加する' })).toBeTruthy();
    await fireEvent.press(buttons[0]);
    expect(onAction).toHaveBeenCalledTimes(1);
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
    expect(screen.queryByText('本を追加する')).toBeNull();
  });

  it('onAction がなければボタンを出さない', async () => {
    await render(<EmptyState title="t" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
