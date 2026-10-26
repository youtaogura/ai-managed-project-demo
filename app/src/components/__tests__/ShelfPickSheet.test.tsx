import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Shelf } from '../../types/shelf';
import { ShelfPickSheet } from '../ShelfPickSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const shelves: Shelf[] = [
  { id: 'a', name: 'SF', order: 0 },
  { id: 'b', name: '哲学', order: 1 },
  { id: 'c', name: '詩', order: 2 },
];

type Props = React.ComponentProps<typeof ShelfPickSheet>;

function build(props: Partial<Props> = {}): Props {
  return {
    visible: true,
    shelves,
    counts: { a: 3, b: 1 },
    selectedIds: ['b'],
    onSubmit: jest.fn(),
    onCreate: jest.fn(),
    onClose: jest.fn(),
    ...props,
  };
}

const checked = (name: string) => screen.getByRole('checkbox', { name }).props.accessibilityState.checked;

describe('ShelfPickSheet', () => {
  it('見出し・説明・行ごとのチェックと冊数を出す。「すべての本」は行に出さない', async () => {
    await render(<ShelfPickSheet {...build()} />);
    expect(screen.getByText('本棚を選ぶ')).toBeTruthy();
    expect(screen.getByText('「すべての本」にはいつも入ります')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(checked('SF')).toBe(false);
    expect(checked('哲学')).toBe(true);
    expect(screen.getByText('3 冊')).toBeTruthy();
    expect(screen.getByText('0 冊')).toBeTruthy();
  });

  it('存在しない ID は初期のチェックに入れない', async () => {
    await render(<ShelfPickSheet {...build({ selectedIds: ['gone'] })} />);
    expect(screen.getByRole('button', { name: '本棚に入れない' })).toBeTruthy();
  });

  it('行を押すと切り替わり、主ボタンの文言が変わる。送るのは本棚の並び順の ID', async () => {
    const props = build();
    await render(<ShelfPickSheet {...props} />);
    expect(screen.getByRole('button', { name: '1 つの本棚に入れる' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: '詩' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'SF' }));
    expect(screen.getByRole('button', { name: '3 つの本棚に入れる' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: '哲学' }));
    await fireEvent.press(screen.getByRole('button', { name: '2 つの本棚に入れる' }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith(['a', 'c']);
  });

  it('0 個なら「本棚に入れない」で空配列を送る', async () => {
    const props = build({ selectedIds: [] });
    await render(<ShelfPickSheet {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: '本棚に入れない' }));
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith([]));
  });

  it('送信に失敗したら文言を出し、閉じない', async () => {
    const props = build({ onSubmit: jest.fn().mockRejectedValue(new Error('x')) });
    await render(<ShelfPickSheet {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: '1 つの本棚に入れる' }));
    expect(await screen.findByText('保存できませんでした')).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('本棚が 0 件なら案内と「＋ 本棚を作る」だけを出す', async () => {
    await render(<ShelfPickSheet {...build({ shelves: [], selectedIds: [] })} />);
    expect(screen.getByText('まだ本棚がありません')).toBeTruthy();
    expect(screen.getByRole('button', { name: '本棚を作る' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/本棚に入れ/)).toBeNull();
  });

  it('シート内で作ると一覧に増え、チェックが入る', async () => {
    const created: Shelf = { id: 'n', name: '新刊', order: 3 };
    const onCreate = jest.fn().mockResolvedValue(created);
    const props = build({ onCreate });
    const { rerender } = await render(<ShelfPickSheet {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: '本棚を作る' }));
    await fireEvent.changeText(await screen.findByLabelText('名前'), '新刊');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('新刊'));
    await rerender(<ShelfPickSheet {...props} shelves={[...shelves, created]} />);
    await waitFor(() => expect(checked('新刊')).toBe(true));
    expect(screen.getByRole('button', { name: '2 つの本棚に入れる' })).toBeTruthy();
  });

  it('閉じて開き直すとチェックは selectedIds に戻り、何も保存しない', async () => {
    const props = build();
    const { rerender } = await render(<ShelfPickSheet {...props} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'SF' }));
    await rerender(<ShelfPickSheet {...props} visible={false} />);
    await rerender(<ShelfPickSheet {...props} />);
    expect(checked('SF')).toBe(false);
    expect(checked('哲学')).toBe(true);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
