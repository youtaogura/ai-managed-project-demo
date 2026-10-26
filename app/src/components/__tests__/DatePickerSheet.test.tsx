import { fireEvent, render, screen } from '@testing-library/react-native';

import { DatePickerSheet } from '../DatePickerSheet';

jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
jest.setSystemTime(new Date(2024, 4, 10, 12, 0, 0));

describe('DatePickerSheet', () => {
  const setup = async (value: string) => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    await render(<DatePickerSheet title="読み始めた日" value={value} onConfirm={onConfirm} onClose={onClose} />);
    return { onConfirm, onClose };
  };
  const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

  it('既存の値から始まり、決定でその値を返す', async () => {
    const { onConfirm } = await setup('2024-01-31');
    expect(screen.getByText('2024年')).toBeTruthy();
    await press('月を増やす');
    expect(screen.getByText('29日')).toBeTruthy();
    await press('決定');
    expect(onConfirm).toHaveBeenCalledWith('2024-02-29');
  });

  it('空なら今日から始まり、年の増減ができる', async () => {
    const { onConfirm } = await setup('');
    await press('年を増やす');
    await press('年を減らす');
    await press('決定');
    expect(onConfirm).toHaveBeenCalledWith('2024-05-10');
  });

  it('クリアすると空を返し、増減すると今日から再開する', async () => {
    const { onConfirm } = await setup('2020-02-02');
    await press('クリア');
    expect(screen.getAllByText('—')).toHaveLength(3);
    await press('決定');
    expect(onConfirm).toHaveBeenCalledWith('');
    await press('日を増やす');
    await press('決定');
    expect(onConfirm).toHaveBeenLastCalledWith('2024-05-11');
  });

  it('「今日」で今日の日付になる', async () => {
    const { onConfirm } = await setup('2020-02-02');
    await press('今日');
    await press('決定');
    expect(onConfirm).toHaveBeenCalledWith('2024-05-10');
  });
});
