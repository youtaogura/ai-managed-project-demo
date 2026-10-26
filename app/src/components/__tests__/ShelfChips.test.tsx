import { fireEvent, render, screen } from '@testing-library/react-native';

import { ShelfChips } from '../ShelfChips';

const shelves = [
  { id: 's1', name: 'SF' },
  { id: 's2', name: '哲学' },
];

describe('ShelfChips', () => {
  it('「すべての本」（選択中）と「＋ 本棚を作る」を出す', async () => {
    await render(<ShelfChips />);
    expect(screen.getByRole('button', { name: 'すべての本' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('＋ 本棚を作る')).toBeTruthy();
  });

  it('本棚は渡された順に並び、選択中だけ selected になる', async () => {
    await render(<ShelfChips shelves={shelves} selectedId="s2" />);
    const names = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    expect(names).toEqual(['すべての本', 'SF', '哲学', '本棚を作る']);
    expect(screen.getByRole('button', { name: '哲学' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'SF' }).props.accessibilityState.selected).toBe(false);
    expect(screen.getByRole('button', { name: 'すべての本' }).props.accessibilityState.selected).toBe(false);
  });

  it('押すと onSelect に ID（「すべての本」は null）が渡る。未指定でも落ちない', async () => {
    const onSelect = jest.fn();
    const { rerender } = await render(<ShelfChips shelves={shelves} onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('button', { name: 'SF' }));
    await fireEvent.press(screen.getByRole('button', { name: 'すべての本' }));
    expect(onSelect.mock.calls).toEqual([['s1'], [null]]);
    await rerender(<ShelfChips shelves={shelves} />);
    await fireEvent.press(screen.getByRole('button', { name: 'SF' }));
  });

  it('名前は 1 行に切る', async () => {
    await render(<ShelfChips shelves={[{ id: 'x', name: 'とても長い本棚の名前とても長い本棚の名前' }]} />);
    expect(screen.getByText('とても長い本棚の名前とても長い本棚の名前').props.numberOfLines).toBe(1);
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
