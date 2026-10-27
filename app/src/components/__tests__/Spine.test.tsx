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

  const hidden = { includeHiddenElements: true };

  it('和文は 1 文字ずつ変形なし、ー だけ 90 度回し、読み上げからは隠す。空でも落ちない', async () => {
    await render(<Spine record={makeRecord({ title: 'ゲーム' })} onPress={jest.fn()} />);
    expect(flat(screen.getByText('ゲ', hidden)).transform).toBeUndefined();
    expect(flat(screen.getByText('ー', hidden)).transform).toEqual([{ rotate: '90deg' }]);
    expect(screen.queryByText('ゲ')).toBeNull();
    await render(<Spine record={makeRecord({ title: '' })} onPress={jest.fn()} />);
  });

  it('英数字は 1 つの Text にまとめて 90 度回す', async () => {
    await render(<Spine record={makeRecord({ title: 'ONE PIECE' })} onPress={jest.fn()} />);
    expect(flat(screen.getByText('ONE PIECE', hidden)).transform).toEqual([{ rotate: '90deg' }]);
  });

  it('2 文字の数字は縦中横で回さない。幅が足りなければ回す', async () => {
    await render(
      <>
        <Spine record={makeRecord({ title: '12' })} dimensions={{ width: 40, height: 150 }} />
        <Spine record={makeRecord({ title: '34' })} dimensions={{ width: 14, height: 150 }} />
      </>,
    );
    expect(flat(screen.getByText('12', hidden)).transform).toBeUndefined();
    expect(flat(screen.getByText('34', hidden)).transform).toEqual([{ rotate: '90deg' }]);
  });

  it('小さい仮名は右上にずらす', async () => {
    await render(<Spine record={makeRecord({ title: 'きゃ' })} onPress={jest.fn()} />);
    expect(flat(screen.getByText('ゃ', hidden)).transform).toHaveLength(2);
    expect(flat(screen.getByText('き', hidden)).transform).toBeUndefined();
  });

  it('収まらないときだけ「︙」を出す', async () => {
    await render(
      <>
        <Spine record={makeRecord({ title: '短い' })} dimensions={{ width: 40, height: 150 }} />
        <Spine
          record={makeRecord({ title: 'サピエンス全史文明の構造と人類の幸福' })}
          dimensions={{ width: 40, height: 100 }}
        />
      </>,
    );
    expect(screen.getAllByText('︙', hidden)).toHaveLength(1);
  });

  it('幅 34px 未満の背表紙は文字を 12px にする', async () => {
    await render(
      <>
        <Spine record={makeRecord({ title: '細' })} dimensions={{ width: 30, height: 150 }} />
        <Spine record={makeRecord({ title: '太' })} dimensions={{ width: 34, height: 150 }} />
      </>,
    );
    expect(flat(screen.getByText('細', hidden)).fontSize).toBe(12);
    expect(flat(screen.getByText('太', hidden)).fontSize).toBe(13);
  });

  it('onPress がないときは押せない画像で、dimensions で大きさを指定できる', async () => {
    await render(<Spine record={makeRecord({ title: '本' })} dimensions={{ width: 22, height: 66 }} />);
    const node = screen.getByRole('image');
    expect(flat(node)).toMatchObject({ width: 22, height: 66 });
  });
});
