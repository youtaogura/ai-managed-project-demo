import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeleteConfirmSheet } from '../DeleteConfirmSheet';

describe('DeleteConfirmSheet', () => {
  const setup = async (props: Partial<Parameters<typeof DeleteConfirmSheet>[0]> = {}) => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <DeleteConfirmSheet visible title="吾輩" onConfirm={onConfirm} onCancel={onCancel} {...props} />,
    );
    return { onConfirm, onCancel };
  };
  const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

  it('見出しと記録名入りの説明を表示する', async () => {
    await setup();
    expect(screen.getByText('この記録を削除しますか？')).toBeTruthy();
    expect(screen.getByText('「吾輩」の記録（メモ・引用・読後メモを含む）が削除されます。元に戻せません。')).toBeTruthy();
  });

  it('「削除する」で onConfirm、「キャンセル」で onCancel が呼ばれる', async () => {
    const { onConfirm, onCancel } = await setup();
    await press('削除する');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    await press('キャンセル');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('busy のときはどちらのボタンも無効', async () => {
    await setup({ busy: true });
    expect(screen.getByRole('button', { name: '削除する' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'キャンセル' }).props.accessibilityState.disabled).toBe(true);
  });
});
