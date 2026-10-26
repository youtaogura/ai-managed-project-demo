import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BookLookupContextProvider } from '../../hooks/useBookLookup';
import type { BookLookupProvider } from '../../lib/bookLookup/BookLookupProvider';
import type { BookLookupResult } from '../../types/book';
import { IsbnLookupScreen } from '../IsbnLookupScreen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));

const ISBN = '9784065199817';
const book = { isbn: ISBN, title: 'T', author: 'A', publisher: null, coverUrl: null };

async function setup(results: Promise<BookLookupResult>[]) {
  const lookupByIsbn = jest.fn();
  results.forEach((r) => lookupByIsbn.mockReturnValueOnce(r));
  const provider: BookLookupProvider = { lookupByIsbn };
  const view = await render(
    <BookLookupContextProvider provider={provider}>
      <IsbnLookupScreen />
    </BookLookupContextProvider>,
  );
  return { lookupByIsbn, view };
}

beforeEach(() => jest.clearAllMocks());

describe('IsbnLookupScreen', () => {
  it('無効な ISBN はエラーを表示し、入力を変えると消える', async () => {
    const { lookupByIsbn } = await setup([]);
    await fireEvent.changeText(screen.getByLabelText('ISBN'), '123');
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    expect(screen.getByText('ISBN を正しく入力してください（10 桁または 13 桁）')).toBeTruthy();
    expect(lookupByIsbn).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('ISBN'), '1234');
    expect(screen.queryByText('ISBN を正しく入力してください（10 桁または 13 桁）')).toBeNull();
  });

  it('見つかったら記録フォームへ replace する（連打しても 1 回）', async () => {
    const { lookupByIsbn } = await setup([Promise.resolve({ status: 'found', book })]);
    await fireEvent.changeText(screen.getByLabelText('ISBN'), '978-4-06-519981-7');
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    await fireEvent.press(screen.getByLabelText('ISBN'));
    expect(lookupByIsbn).toHaveBeenCalledTimes(1);
    expect(lookupByIsbn).toHaveBeenCalledWith(ISBN);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'book', title: 'T', isbn: ISBN, creator: 'A' },
    });
  });

  it('見つからない場合は手入力で続けられる', async () => {
    await setup([Promise.resolve({ status: 'not_found' })]);
    await fireEvent.changeText(screen.getByLabelText('ISBN'), ISBN);
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '手入力で続ける' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'book', isbn: ISBN },
    });
  });

  it('エラー時は再試行できる', async () => {
    const { lookupByIsbn } = await setup([
      Promise.resolve({ status: 'error' }),
      Promise.resolve({ status: 'found', book }),
    ]);
    await fireEvent.changeText(screen.getByLabelText('ISBN'), ISBN);
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    expect(
      await screen.findByText('書誌情報を取得できませんでした。通信状況を確認してください'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '再試行' }));
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('ISBN が無効なまま手入力で続けると ISBN なしで遷移する', async () => {
    await setup([]);
    await fireEvent.press(screen.getByRole('button', { name: '手入力で続ける' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'book' },
    });
  });

  it('アンマウント後の結果は無視する', async () => {
    let resolve: (r: BookLookupResult) => void = () => {};
    const { view } = await setup([new Promise((r) => (resolve = r))]);
    await fireEvent.changeText(screen.getByLabelText('ISBN'), ISBN);
    await fireEvent.press(screen.getByRole('button', { name: '探す' }));
    await view.unmount();
    await act(async () => resolve({ status: 'found', book }));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
