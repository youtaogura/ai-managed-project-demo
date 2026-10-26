import { fireEvent, render, screen } from '@testing-library/react-native';

import { AddSheet, type AddTarget } from '../AddSheet';

async function setup() {
  const onSelect = jest.fn<void, [AddTarget]>();
  await render(<AddSheet visible onClose={jest.fn()} onSelect={onSelect} />);
  return onSelect;
}

describe('AddSheet', () => {
  it.each([
    ['バーコードを読み取る', 'scan'],
    ['本をタイトルで探す', 'search'],
    ['ISBN を入力する', 'isbn'],
    ['本を手で入力する', 'manual'],
  ])('「%s」で %s を選ぶ', async (label, target) => {
    const onSelect = await setup();
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('入口は 4 つだけで、映画・ドラマ・アニメの入口は出ない', async () => {
    await setup();
    expect(screen.getAllByRole('button', { name: /バーコード|タイトル|ISBN|手で入力/ })).toHaveLength(4);
    expect(screen.queryByText(/映画|ドラマ|アニメ/)).toBeNull();
  });
});
