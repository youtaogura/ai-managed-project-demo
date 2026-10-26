import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { spineColorForTitle } from '../../lib/bookSpineColor';
import type { BookCandidate } from '../../types/bookSearch';
import { BookSearchRow } from '../BookSearchRow';

const full: BookCandidate = {
  title: '本A',
  author: '著者A',
  publisher: '出版A',
  publishedYear: '2020',
  isbn: '9784065199817',
  ndlId: null,
};
const bare: BookCandidate = { title: '本B', author: null, publisher: null, publishedYear: null, isbn: null, ndlId: null };

describe('BookSearchRow', () => {
  it('タイトル・「作者 · 出版社 · 年」・› を出し、押すと onPress', async () => {
    const onPress = jest.fn();
    await render(<BookSearchRow candidate={full} onPress={onPress} />);
    expect(screen.getByText('著者A · 出版A · 2020')).toBeTruthy();
    expect(screen.getByText('›')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '本A' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['出版社のみ', { publisher: '出版A' }, '出版A'],
    ['出版年のみ', { publishedYear: '2020' }, '2020'],
    ['作者のみ', { author: '著者A' }, '著者A'],
  ])('%s は区切りなしで詰める', async (_name, partial, expected) => {
    await render(<BookSearchRow candidate={{ ...bare, ...partial }} onPress={jest.fn()} />);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('作者・出版社・出版年がなければ副題の行を出さない', async () => {
    await render(<BookSearchRow candidate={bare} onPress={jest.fn()} />);
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('幅 22 の小さな背表紙を、タイトルから決めた色で出す', async () => {
    await render(<BookSearchRow candidate={full} onPress={jest.fn()} />);
    const spine = screen.getByRole('image');
    const style = StyleSheet.flatten(spine.props.style as never) as Record<string, unknown>;
    expect(style.width).toBe(22);
    expect(spineColorForTitle('本A')).toBeDefined();
    expect(Object.values(colors)).toContain(style.backgroundColor);
  });

  it('disabled なら押せない', async () => {
    const onPress = jest.fn();
    await render(<BookSearchRow candidate={full} onPress={onPress} disabled />);
    const row = screen.getByRole('button', { name: '本A' });
    expect(row).toBeDisabled();
    await fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });
});
