import { fireEvent, render, screen } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { AddSheet, type AddTarget } from '../AddSheet';

async function setup() {
  const onSelect = jest.fn<void, [AddTarget]>();
  await render(<AddSheet visible onClose={jest.fn()} onSelect={onSelect} />);
  return onSelect;
}

describe('AddSheet', () => {
  it.each([
    ['バーコードを読み取る', 'scan'],
    ['タイトルで探す', 'search'],
    ['ISBN を入力する', 'isbn'],
    ['手で入力する', 'manual'],
  ])('「%s」で %s を選ぶ', async (label, target) => {
    const onSelect = await setup();
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it('見出しと、各入口の説明が出る', async () => {
    await setup();
    expect(screen.getByText('本を追加する')).toBeTruthy();
    for (const text of [
      '本の裏のバーコードを映すだけ',
      'タイトルや作者の名前から',
      '10 桁または 13 桁の番号',
      '見つからない本、同人誌など',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('「バーコードを読み取る」だけ墨の面と accentInk の文字', async () => {
    await setup();
    const flat = (n: { props: { style?: unknown } }) => StyleSheet.flatten(n.props.style as never) as Record<string, unknown>;
    expect(flat(screen.getByRole('button', { name: 'バーコードを読み取る' })).backgroundColor).toBe(colors.accent);
    expect(flat(screen.getByText('バーコードを読み取る')).color).toBe(colors.accentInk);
    const other = flat(screen.getByRole('button', { name: 'タイトルで探す' }));
    expect(other.backgroundColor).toBe(colors.surface2);
    expect(other.borderColor).toBe(colors.lineStrong);
  });

  it('入口は 4 つだけで、映画・ドラマ・アニメの入口は出ない', async () => {
    await setup();
    expect(screen.getAllByRole('button', { name: /バーコード|タイトル|ISBN|手で入力/ })).toHaveLength(4);
    expect(screen.queryByText(/映画|ドラマ|アニメ/)).toBeNull();
  });
});
