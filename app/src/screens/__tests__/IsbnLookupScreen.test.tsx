import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BookLookupContextProvider } from '../../hooks/useBookLookup';
import { CoverResolverContextProvider } from '../../hooks/useCoverResolver';
import type { BookLookupProvider } from '../../lib/bookLookup/BookLookupProvider';
import type { BookLookupResult } from '../../types/book';
import { IsbnLookupScreen } from '../IsbnLookupScreen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

const book = {
  isbn: '9784065199817',
  title: 'タイトル',
  author: '著者',
  publisher: '出版社',
  coverUrl: 'https://example.com/c.jpg',
};

async function setup(
  results: BookLookupResult[] | Promise<BookLookupResult>,
  resolveCover: jest.Mock<Promise<string | null>, [string]> = jest.fn(async (_isbn: string) => null),
) {
  const lookupByIsbn = jest.fn(async (_isbn: string): Promise<BookLookupResult> => {
    if (results instanceof Promise) return results;
    return results.shift() ?? { status: 'error' };
  });
  const provider: BookLookupProvider = { lookupByIsbn };
  const view = await render(
    <BookLookupContextProvider provider={provider}>
      <CoverResolverContextProvider resolver={resolveCover}>
        <IsbnLookupScreen />
      </CoverResolverContextProvider>
    </BookLookupContextProvider>,
  );
  return { lookupByIsbn, view };
}

async function enter(text: string) {
  await fireEvent.changeText(screen.getByLabelText('ISBN'), text);
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => jest.clearAllMocks());

describe('IsbnLookupScreen の書影補完', () => {
  const noCover = { ...book, coverUrl: null };

  it('openBD に書影がなければ取得した URL をフォームの初期値に入れる', async () => {
    const resolveCover = jest.fn(async (_isbn: string) => 'https://cover/x.jpg');
    await setup([{ status: 'found', book: noCover }], resolveCover);
    await enter('9784065199817');
    await press('探す');
    expect(resolveCover).toHaveBeenCalledWith('9784065199817');
    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ coverUrl: 'https://cover/x.jpg' }) }),
    );
  });

  it('openBD に書影があれば取得しない', async () => {
    const resolveCover = jest.fn(async (_isbn: string) => 'https://cover/x.jpg');
    await setup([{ status: 'found', book }], resolveCover);
    await enter('9784065199817');
    await press('探す');
    expect(resolveCover).not.toHaveBeenCalled();
  });

  it('見つからないときは取得せず、取得が null でも遷移する', async () => {
    const resolveCover = jest.fn(async (_isbn: string) => null);
    await setup([{ status: 'not_found' }, { status: 'found', book: noCover }], resolveCover);
    await enter('9784065199817');
    await press('探す');
    expect(resolveCover).not.toHaveBeenCalled();
    await press('探す');
    expect(resolveCover).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
    const call = (router.replace as jest.Mock).mock.calls[0][0];
    expect(call.params.coverUrl).toBeUndefined();
  });
});

describe('IsbnLookupScreen', () => {
  it('入力欄とボタンを表示する', async () => {
    await setup([]);
    expect(await screen.findByLabelText('ISBN')).toBeTruthy();
    expect(screen.getByRole('button', { name: '探す' })).toBeTruthy();
  });

  it('無効な ISBN ではエラーを表示し Provider を呼ばない', async () => {
    const { lookupByIsbn } = await setup([]);
    await enter('12345');
    await press('探す');
    expect(
      await screen.findByText('ISBN を正しく入力してください（10 桁または 13 桁）'),
    ).toBeTruthy();
    expect(lookupByIsbn).not.toHaveBeenCalled();
    await enter('1234');
    expect(screen.queryByText('ISBN を正しく入力してください（10 桁または 13 桁）')).toBeNull();
  });

  it('ISBN-10 は ISBN-13 に変換して 1 回呼び、found なら記録フォームへ replace する', async () => {
    const { lookupByIsbn } = await setup([{ status: 'found', book }]);
    await enter('4-06-519981-6');
    await press('探す');
    expect(lookupByIsbn).toHaveBeenCalledTimes(1);
    expect(lookupByIsbn).toHaveBeenCalledWith('9784065199817');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: {
        kind: 'book',
        title: 'タイトル',
        isbn: '9784065199817',
        creator: '著者',
        publisher: '出版社',
        coverUrl: 'https://example.com/c.jpg',
      },
    });
  });

  it('取得中は無効化され、連打しても 1 回しか呼ばれない', async () => {
    let resolve: (r: BookLookupResult) => void = () => {};
    const { lookupByIsbn } = await setup(new Promise<BookLookupResult>((r) => (resolve = r)));
    await enter('9784065199817');
    await press('探す');
    for (const button of screen.getAllByRole('button')) await fireEvent.press(button);
    expect(lookupByIsbn).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('探す')).toBeNull();
    await act(async () => resolve({ status: 'not_found' }));
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
  });

  it('見つからないときは ISBN を引き継いで手入力へ進める', async () => {
    await setup([{ status: 'not_found' }]);
    await enter('9784065199817');
    await press('探す');
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    await press('手入力で続ける');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'book', isbn: '9784065199817' },
    });
    await enter('9784065199817 ');
    expect(screen.queryByText('見つかりませんでした')).toBeNull();
  });

  it('エラー時は再試行でき、手入力でも進める', async () => {
    const { lookupByIsbn } = await setup([{ status: 'error' }, { status: 'found', book }]);
    await enter('9784065199817');
    await press('探す');
    expect(
      await screen.findByText('書誌情報を取得できませんでした。通信状況を確認してください'),
    ).toBeTruthy();
    await press('再試行');
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('無効な ISBN のまま手入力へ進むと ISBN なしで遷移する', async () => {
    await setup([]);
    await enter('abc');
    await press('手入力で続ける');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'book' },
    });
  });

  it('アンマウント後の結果は無視する', async () => {
    let resolve: (r: BookLookupResult) => void = () => {};
    const { view } = await setup(new Promise<BookLookupResult>((r) => (resolve = r)));
    await enter('9784065199817');
    await press('探す');
    await view.unmount();
    await act(async () => resolve({ status: 'found', book }));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
