import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { getSpineSize } from '../../lib/spineLayout';
import { makeRecord } from '../../testUtils';
import { Spine } from '../Spine';

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

describe('Spine', () => {
  it('読み上げラベルは「タイトル、作者、ステータス」で、ボタン', async () => {
    await render(
      <Spine record={makeRecord({ title: '本', creator: '著者', status: 'completed' })} onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: '本、著者、読んだ' })).toBeTruthy();
  });

  it('タップで onPress に記録が渡る', async () => {
    const onPress = jest.fn();
    const record = makeRecord({ id: 'x', title: '本' });
    await render(<Spine record={record} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(record);
  });

  it('大きさは ID から決まり、面の色は spineColor', async () => {
    await render(
      <Spine record={makeRecord({ id: 'x', spineColor: 'spine-3' })} onPress={jest.fn()} />,
    );
    const style = flat(screen.getByRole('button'));
    expect(style).toMatchObject({ ...getSpineSize('x'), backgroundColor: colors.spine3 });
  });

  it('栞はお気に入りだけ', async () => {
    const { rerender } = await render(
      <Spine record={makeRecord({ favorite: false })} onPress={jest.fn()} />,
    );
    expect(screen.queryByTestId('spine-ribbon')).toBeNull();
    await rerender(<Spine record={makeRecord({ favorite: true })} onPress={jest.fn()} />);
    expect(screen.getByTestId('spine-ribbon')).toBeTruthy();
  });

  it('ステータスだけ違う 2 冊は同じ見た目', async () => {
    await render(
      <>
        <Spine record={makeRecord({ id: 'same', title: 'A', status: 'planned' })} onPress={jest.fn()} />
        <Spine record={makeRecord({ id: 'same', title: 'B', status: 'completed' })} onPress={jest.fn()} />
      </>,
    );
    const [a, b] = screen.getAllByRole('button');
    expect(flat(a)).toEqual(flat(b));
  });

  it('タイトルを 1 文字ずつ出し、読み上げからは隠す。空でも落ちない', async () => {
    await render(<Spine record={makeRecord({ title: '本棚' })} onPress={jest.fn()} />);
    expect(screen.getByText('本', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('棚', { includeHiddenElements: true })).toBeTruthy();
    await render(<Spine record={makeRecord({ title: '' })} onPress={jest.fn()} />);
  });

  it('幅 34px 未満の背表紙は文字を 12px にする', async () => {
    const narrowId = Array.from({ length: 500 }, (_, i) => `n${i}`).find(
      (id) => getSpineSize(id).width < 34,
    );
    const wideId = Array.from({ length: 500 }, (_, i) => `w${i}`).find(
      (id) => getSpineSize(id).width >= 34,
    );
    await render(
      <>
        <Spine record={makeRecord({ id: narrowId, title: '細' })} onPress={jest.fn()} />
        <Spine record={makeRecord({ id: wideId, title: '太' })} onPress={jest.fn()} />
      </>,
    );
    expect(flat(screen.getByText('細', { includeHiddenElements: true })).fontSize).toBe(12);
    expect(flat(screen.getByText('太', { includeHiddenElements: true })).fontSize).toBe(13);
  });

  it('onPress がないときは押せない画像で、dimensions で大きさを指定できる', async () => {
    await render(<Spine record={makeRecord({ title: '本' })} dimensions={{ width: 22, height: 66 }} />);
    const node = screen.getByRole('image');
    expect(flat(node)).toMatchObject({ width: 22, height: 66 });
  });
});
