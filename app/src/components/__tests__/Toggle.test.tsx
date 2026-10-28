import { fireEvent, render, screen } from '@testing-library/react-native';

import { Toggle, ToggleRow } from '../Toggle';

describe('Toggle', () => {
  it('switch として state を持ち、押すと反転した値で onValueChange を呼ぶ', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle value={false} onValueChange={onValueChange} label="お気に入り" />);
    const sw = screen.getByRole('switch', { name: 'お気に入り' });
    expect(sw.props.accessibilityState).toMatchObject({ checked: false, disabled: false });
    await fireEvent.press(sw);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('disabled では押しても呼ばれない', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle small disabled value onValueChange={onValueChange} label="固定" />);
    const sw = screen.getByRole('switch', { name: '固定' });
    expect(sw.props.accessibilityState).toMatchObject({ checked: true, disabled: true });
    await fireEvent.press(sw);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('ToggleRow', () => {
  it('small とコンテナの style を受け取れる', async () => {
    await render(<ToggleRow small style={{ borderWidth: 1 }} value onValueChange={jest.fn()} label="小さい" />);
    expect(screen.getAllByRole('switch', { name: '小さい' })).toHaveLength(1);
  });

  it('説明を出し、行全体を押して切り替える', async () => {
    const onValueChange = jest.fn();
    await render(<ToggleRow value onValueChange={onValueChange} label="お気に入りにする" description="説明です" />);
    expect(screen.getByText('説明です')).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch', { name: 'お気に入りにする' }));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('説明なしでも描ける', async () => {
    await render(<ToggleRow value={false} onValueChange={jest.fn()} label="だけ" />);
    expect(screen.getByRole('switch', { name: 'だけ' })).toBeTruthy();
  });
});
