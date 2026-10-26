import { fireEvent, render, screen } from '@testing-library/react-native';

import { getSpineSize } from '../../lib/spineLayout';
import { makeRecord } from '../../testUtils';
import { Shelf } from '../Shelf';

const books = Array.from({ length: 12 }, (_, i) =>
  makeRecord({ id: `b${i}`, title: `本${i}` }),
);

describe('Shelf', () => {
  it('広い棚では 1 段に収まり、棚板は 1 枚', async () => {
    await render(<Shelf records={books} width={2000} onPressRecord={jest.fn()} />);
    expect(screen.getAllByTestId('shelf-board')).toHaveLength(1);
    expect(screen.getAllByRole('button')).toHaveLength(12);
  });

  it('幅が狭いと折り返し、棚板の数は段の数と同じ', async () => {
    const width = getSpineSize('b0').width * 3 + 20;
    await render(<Shelf records={books} width={width} onPressRecord={jest.fn()} />);
    expect(screen.getAllByTestId('shelf-board').length).toBeGreaterThan(2);
    expect(screen.getAllByRole('button')).toHaveLength(12);
  });

  it('背表紙のタップで onPressRecord が呼ばれる', async () => {
    const onPressRecord = jest.fn();
    await render(<Shelf records={books} width={2000} onPressRecord={onPressRecord} />);
    await fireEvent.press(screen.getAllByRole('button')[0]);
    expect(onPressRecord).toHaveBeenCalledWith(books[0]);
  });

  it('0 冊なら棚板も出ない', async () => {
    await render(<Shelf records={[]} width={300} onPressRecord={jest.fn()} />);
    expect(screen.queryByTestId('shelf-board')).toBeNull();
  });
});
