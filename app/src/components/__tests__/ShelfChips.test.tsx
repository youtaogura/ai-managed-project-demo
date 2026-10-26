import { fireEvent, render, screen } from '@testing-library/react-native';

import { ShelfChips } from '../ShelfChips';

describe('ShelfChips', () => {
  it('「すべての本」（選択中）と「＋ 本棚を作る」を出す', async () => {
    await render(<ShelfChips />);
    expect(screen.getByRole('button', { name: 'すべての本' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('＋ 本棚を作る')).toBeTruthy();
  });

  it('shelves が渡されれば「すべての本」の後ろに出す', async () => {
    await render(<ShelfChips shelves={[{ id: 's1', name: 'SF' }]} />);
    expect(screen.getByRole('button', { name: 'SF' })).toBeTruthy();
  });

  it('「＋ 本棚を作る」で onCreateShelf が呼ばれ、未指定でも落ちない', async () => {
    const onCreateShelf = jest.fn();
    const { rerender } = await render(<ShelfChips onCreateShelf={onCreateShelf} />);
    await fireEvent.press(screen.getByRole('button', { name: '本棚を作る' }));
    expect(onCreateShelf).toHaveBeenCalledTimes(1);
    await rerender(<ShelfChips />);
    await fireEvent.press(screen.getByRole('button', { name: '本棚を作る' }));
  });
});
