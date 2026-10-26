import { fireEvent, render, screen } from '@testing-library/react-native';

import { AddSheet, type AddTarget } from '../AddSheet';

async function setup(mediaSearchEnabled: boolean) {
  const onSelect = jest.fn<void, [AddTarget]>();
  await render(
    <AddSheet
      visible
      onClose={jest.fn()}
      onSelect={onSelect}
      mediaSearchEnabled={mediaSearchEnabled}
    />,
  );
  return onSelect;
}

describe('AddSheet', () => {
  it.each([
    ['バーコードを読み取る', 'scan'],
    ['本をタイトルで探す', 'search'],
    ['ISBN を入力する', 'isbn'],
    ['本を手で入力する', 'manual'],
    ['映画・ドラマ・アニメをタイトルで探す', 'mediaSearch'],
    ['映画・ドラマ・アニメを手で入力する', 'mediaManual'],
  ])('「%s」で %s を選ぶ', async (label, target) => {
    const onSelect = await setup(true);
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('見出しは「本・漫画」「映画・ドラマ・アニメ」', async () => {
    await setup(true);
    expect(screen.getByText('本・漫画')).toBeTruthy();
    expect(screen.getByText('映画・ドラマ・アニメ')).toBeTruthy();
  });

  it('API キー未設定なら作品の「タイトルで探す」は出ない', async () => {
    await setup(false);
    expect(
      screen.queryByRole('button', { name: '映画・ドラマ・アニメをタイトルで探す' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: '映画・ドラマ・アニメを手で入力する' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '本をタイトルで探す' })).toBeTruthy();
  });
});
