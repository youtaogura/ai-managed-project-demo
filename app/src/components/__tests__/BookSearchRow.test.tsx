import { fireEvent, render, screen } from '@testing-library/react-native';

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
  it('タイトル・作者・「出版社 · 出版年」・› を出し、押すと onPress', async () => {
    const onPress = jest.fn();
    await render(<BookSearchRow candidate={full} onPress={onPress} />);
    expect(screen.getByText('著者A')).toBeTruthy();
    expect(screen.getByText('出版A · 2020')).toBeTruthy();
    expect(screen.getByText('›')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '本A' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['出版社のみ', { publisher: '出版A' }, '出版A'],
    ['出版年のみ', { publishedYear: '2020' }, '2020'],
  ])('%s は区切りなしで詰める', async (_name, partial, expected) => {
    await render(<BookSearchRow candidate={{ ...bare, ...partial }} onPress={jest.fn()} />);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('作者・出版社・出版年がなければ副題の行を出さず、書影がなくても文字の表紙を出す', async () => {
    await render(<BookSearchRow candidate={bare} onPress={jest.fn()} />);
    expect(screen.getAllByText('本B').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('image')).toBeNull();
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
