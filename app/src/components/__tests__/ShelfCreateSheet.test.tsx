import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ValidationError } from '../../lib/recordRepository';
import { ShelfCreateSheet } from '../ShelfCreateSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const shelves = [{ id: 'a', name: 'SF' }];

async function setup(props: Partial<React.ComponentProps<typeof ShelfCreateSheet>> = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  const view = await render(
    <ShelfCreateSheet visible shelves={shelves} onSubmit={onSubmit} onClose={onClose} {...props} />,
  );
  return { onSubmit, onClose, ...view };
}

describe('ShelfCreateSheet', () => {
  it('見出し・入力欄・例のチップ（既にある名前を除く）・主ボタンを出す', async () => {
    await setup();
    expect(screen.getByText('本棚を作る')).toBeTruthy();
    expect(screen.getByLabelText('名前')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'SF' })).toBeNull();
    for (const name of ['哲学', 'いつか読み返す', '仕事の本']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: '作る' })).toBeTruthy();
  });

  it('例のチップで名前の欄が上書きされる', async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText('名前'), 'あ');
    await fireEvent.press(screen.getByRole('button', { name: '哲学' }));
    expect(screen.getByLabelText('名前').props.value).toBe('哲学');
  });

  it('全部の例が使われていれば例の欄を出さない', async () => {
    await setup({
      shelves: ['SF', '哲学', 'いつか読み返す', '仕事の本'].map((name, i) => ({ id: String(i), name })),
    });
    expect(screen.queryByText('例')).toBeNull();
  });

  it('「作る」で前後の空白を除いた名前を渡し、成功したら閉じる', async () => {
    const { onSubmit, onClose } = await setup();
    await fireEvent.changeText(screen.getByLabelText('名前'), ' 詩集 ');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith('詩集');
  });

  it('空・重複は入力欄の下にエラーを出し、閉じず保存もしない。入力で消える', async () => {
    const { onSubmit, onClose } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(screen.getByText('本棚の名前を入力してください')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('名前'), 'ｓｆ');
    expect(screen.queryByText('本棚の名前を入力してください')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(screen.getByText('同じ名前の本棚があります')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('保存に失敗したら文言を出して閉じない。ValidationError はその文言を出す', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new ValidationError('同じ名前の本棚があります'));
    const { onClose } = await setup({ onSubmit });
    await fireEvent.changeText(screen.getByLabelText('名前'), '詩集');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByText('同じ名前の本棚があります')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('閉じて開き直すと入力欄とエラーが空に戻る', async () => {
    const { rerender, onSubmit, onClose } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    await fireEvent.changeText(screen.getByLabelText('名前'), 'abc');
    await rerender(<ShelfCreateSheet visible={false} shelves={shelves} onSubmit={onSubmit} onClose={onClose} />);
    await rerender(<ShelfCreateSheet visible shelves={shelves} onSubmit={onSubmit} onClose={onClose} />);
    expect(screen.getByLabelText('名前').props.value).toBe('');
    expect(screen.queryByText('本棚の名前を入力してください')).toBeNull();
  });

  it('名前の変更: 初期値・見出し・主ボタンを変えられ、自分自身の名前のまま保存できる', async () => {
    const { onSubmit } = await setup({
      title: '名前を変える',
      initialName: 'SF',
      submitLabel: '保存する',
      exceptId: 'a',
    });
    expect(screen.getByText('名前を変える')).toBeTruthy();
    expect(screen.getByLabelText('名前').props.value).toBe('SF');
    await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('SF'));
  });
});
