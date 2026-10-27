import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BookLookupContextProvider } from '../../hooks/useBookLookup';
import type { BookLookupProvider } from '../../lib/bookLookup/BookLookupProvider';
import type { BookLookupResult } from '../../types/book';
import { IsbnLookupScreen } from '../IsbnLookupScreen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
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
  props: ComponentProps<typeof IsbnLookupScreen> = {},
) {
  const lookupByIsbn = jest.fn(async (_isbn: string): Promise<BookLookupResult> => {
    if (results instanceof Promise) return results;
    return results.shift() ?? { status: 'error' };
  });
  const provider: BookLookupProvider = { lookupByIsbn };
  const view = await render(
    <BookLookupContextProvider provider={provider}>
      <IsbnLookupScreen {...props} />
    </BookLookupContextProvider>,
  );
  return { lookupByIsbn, view };
}

async function enter(text: string) {
  await fireEvent.changeText(screen.getByLabelText('ISBN（10 桁または 13 桁）'), text);
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => jest.clearAllMocks());

const INVALID = 'ISBN を正しく入力してください（10 桁または 13 桁）';
const LOOKUP_ERROR = '書誌情報を取得できませんでした。通信状況を確認してください';

describe('IsbnLookupScreen の遷移先の値', () => {
  it('書影を取りに行かず、見つかった書誌情報をそのままフォームの初期値に渡す', async () => {
    await setup([{ status: 'found', book: { ...book, coverUrl: null } }]);
    await enter('9784065199817');
    await press('探す');
    expect(router.replace).toHaveBeenCalledTimes(1);
    const call = (router.replace as jest.Mock).mock.calls[0][0];
    expect(call.params.title).toBe(book.title);
    expect(call.params.coverUrl).toBeUndefined();
  });
});

describe('IsbnLookupScreen', () => {
  it('上部バー・入力欄・ヒント・ボタンを表示し、閉じるで戻る', async () => {
    await setup([]);
    expect(screen.getByText('ISBN を入力する')).toBeTruthy();
    expect(await screen.findByLabelText('ISBN（10 桁または 13 桁）')).toBeTruthy();
    expect(
      screen.getByText('ハイフンはあってもなくても大丈夫です。裏表紙やカバー袖に書かれています。'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '探す' })).toBeTruthy();
    await press('閉じる');
    expect(router.back).toHaveBeenCalled();
  });

  it('「バーコードで読み取る」でスキャン画面へ replace する', async () => {
    await setup([]);
    await press('バーコードで読み取る');
    expect(router.replace).toHaveBeenCalledWith('/record/scan');
  });

  it('無効な ISBN ではエラーを表示し Provider を呼ばない', async () => {
    const { lookupByIsbn } = await setup([]);
    await enter('12345');
    await press('探す');
    expect(await screen.findByText(INVALID)).toBeTruthy();
    expect(lookupByIsbn).not.toHaveBeenCalled();
    await enter('1234');
    expect(screen.queryByText(INVALID)).toBeNull();
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
        title: 'タイトル',
        isbn: '9784065199817',
        creator: '著者',
        publisher: '出版社',
        coverUrl: 'https://example.com/c.jpg',
        sourceProvider: 'openbd',
        sourceId: '9784065199817',
      },
    });
  });

  it('取得中は入力欄が編集不可・探すが無効で、骨組みカードを出し、連打しても 1 回しか呼ばれない', async () => {
    let resolve: (r: BookLookupResult) => void = () => {};
    const { lookupByIsbn } = await setup(new Promise<BookLookupResult>((r) => (resolve = r)));
    await enter('9784065199817');
    await press('探す');
    expect(screen.getByText('書誌情報を検索中…')).toBeTruthy();
    expect(screen.getByLabelText('ISBN（10 桁または 13 桁）').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: '探す' })).toBeDisabled();
    for (const button of screen.getAllByRole('button')) await fireEvent.press(button);
    expect(lookupByIsbn).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ status: 'not_found' }));
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    expect(screen.queryByText('書誌情報を検索中…')).toBeNull();
  });

  it('見つからないときはカードを出し、探す・バーコードのボタンを隠す', async () => {
    await setup([{ status: 'not_found' }]);
    await enter('9784065199817');
    await press('探す');
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    expect(
      screen.getByText(
        '古い本や同人誌は登録されていないことがあります。ISBN はそのまま、残りを手で入力できます。',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '探す' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'バーコードで読み取る' })).toBeNull();
    await press('手で入力する');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { isbn: '9784065199817' },
    });
  });

  it('「もう一度探す」は同じ ISBN で再検索し、入力を編集するとカードが消える', async () => {
    const { lookupByIsbn } = await setup([{ status: 'not_found' }, { status: 'not_found' }]);
    await enter('9784065199817');
    await press('探す');
    await screen.findByText('見つかりませんでした');
    await press('もう一度探す');
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    expect(lookupByIsbn).toHaveBeenLastCalledWith('9784065199817');
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    await enter('9784065199817 ');
    expect(screen.queryByText('見つかりませんでした')).toBeNull();
    expect(screen.getByRole('button', { name: '探す' })).toBeTruthy();
  });

  it('「タイトルで探す」でタイトル検索へ replace する', async () => {
    await setup([], { initialIsbn: '9784065199817', initialNotFound: true });
    await press('タイトルで探す');
    expect(router.replace).toHaveBeenCalledWith('/record/search');
  });

  it('パラメータの ISBN を初期値にし、notFound なら最初から見つかりませんでした状態で開く', async () => {
    const { lookupByIsbn } = await setup([], { initialIsbn: '9784065199817', initialNotFound: true });
    expect(screen.getByLabelText('ISBN（10 桁または 13 桁）').props.value).toBe('9784065199817');
    expect(screen.getByText('見つかりませんでした')).toBeTruthy();
    expect(lookupByIsbn).not.toHaveBeenCalled();
  });

  it('パラメータの ISBN だけなら通常状態で開く', async () => {
    await setup([], { initialIsbn: '9784065199817' });
    expect(screen.getByLabelText('ISBN（10 桁または 13 桁）').props.value).toBe('9784065199817');
    expect(screen.queryByText('見つかりませんでした')).toBeNull();
    expect(screen.getByRole('button', { name: '探す' })).toBeTruthy();
  });

  it('エラー時は骨組みカードに再試行を出し、押すと同じ ISBN で再検索する', async () => {
    const { lookupByIsbn } = await setup([{ status: 'error' }, { status: 'found', book }]);
    await enter('9784065199817');
    await press('探す');
    expect(await screen.findByText(LOOKUP_ERROR)).toBeTruthy();
    await press('再試行');
    expect(lookupByIsbn).toHaveBeenCalledTimes(2);
    expect(lookupByIsbn).toHaveBeenLastCalledWith('9784065199817');
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('不正な ISBN のまま見つかりませんでした状態から手入力へ進むと ISBN なしで遷移する', async () => {
    await setup([], { initialIsbn: 'abc', initialNotFound: true });
    await press('手で入力する');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: {},
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
