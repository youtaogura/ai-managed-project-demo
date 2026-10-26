import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MediaKind } from '../../types/record';
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

describe('AddSheet（使う種別）', () => {
  async function setupKinds(enabledKinds: MediaKind[]) {
    await render(
      <AddSheet
        visible
        onClose={jest.fn()}
        onSelect={jest.fn()}
        mediaSearchEnabled
        enabledKinds={enabledKinds}
      />,
    );
  }

  it('本・漫画を使わないと「本・漫画」の段を出さない', async () => {
    await setupKinds(['movie']);
    expect(screen.queryByText('本・漫画')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ISBN を入力する' })).toBeNull();
    expect(screen.getByText('映画・ドラマ・アニメ')).toBeTruthy();
  });

  it('映画・ドラマ・アニメを使わないと、その段を出さない', async () => {
    await setupKinds(['manga']);
    expect(screen.getByText('本・漫画')).toBeTruthy();
    expect(screen.queryByText('映画・ドラマ・アニメ')).toBeNull();
    expect(screen.queryByRole('button', { name: '映画・ドラマ・アニメを手で入力する' })).toBeNull();
  });
});
