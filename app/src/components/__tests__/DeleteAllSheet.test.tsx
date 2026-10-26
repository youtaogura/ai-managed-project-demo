import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeleteAllSheet } from '../DeleteAllSheet';

describe('DeleteAllSheet', () => {
  const setup = async (props: Partial<Parameters<typeof DeleteAllSheet>[0]> = {}) => {
    const handlers = { onExport: jest.fn(), onCancel: jest.fn(), onConfirm: jest.fn() };
    await render(<DeleteAllSheet visible count={7} {...handlers} {...props} />);
    return handlers;
  };
  const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

  it('見出しと件数入りの説明を出す', async () => {
    await setup();
    expect(screen.getByText('すべての記録を削除しますか？')).toBeTruthy();
    expect(
      screen.getByText(
        '7 件の記録と、付けた写真がすべて削除されます。元に戻せません。設定はそのまま残ります。',
      ),
    ).toBeTruthy();
  });

  it('3 つのボタンがそれぞれのコールバックを呼ぶ', async () => {
    const h = await setup();
    await press('先に書き出す');
    await press('キャンセル');
    await press('すべて削除する');
    expect(h.onExport).toHaveBeenCalledTimes(1);
    expect(h.onCancel).toHaveBeenCalledTimes(1);
    expect(h.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('busy 中はどのボタンも押せない', async () => {
    const h = await setup({ busy: true });
    await press('先に書き出す');
    await press('キャンセル');
    await press('すべて削除する');
    expect(h.onExport).not.toHaveBeenCalled();
    expect(h.onCancel).not.toHaveBeenCalled();
    expect(h.onConfirm).not.toHaveBeenCalled();
  });
});
