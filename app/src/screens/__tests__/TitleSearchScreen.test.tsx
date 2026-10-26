import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BookLookupContextProvider } from '../../hooks/useBookLookup';
import { BookSearchContextProvider } from '../../hooks/useBookSearch';
import { CoverResolverContextProvider } from '../../hooks/useCoverResolver';
import type { BookLookupProvider } from '../../lib/bookLookup/BookLookupProvider';
import type { BookSearchProvider } from '../../lib/bookSearch/BookSearchProvider';
import type { BookLookupResult } from '../../types/book';
import type { BookCandidate, BookSearchResult } from '../../types/bookSearch';
import { TitleSearchScreen } from '../TitleSearchScreen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

const withIsbn: BookCandidate = {
  title: '本A',
  author: '著者A',
  publisher: '出版A',
  publishedYear: '2020',
  isbn: '9784065199817',
  ndlId: null,
};
const noIsbn: BookCandidate = {
  title: '本B',
  author: null,
  publisher: null,
  publishedYear: null,
  isbn: null,
  ndlId: null,
};
const book = {
  isbn: '9784065199817',
  title: 'openBD の本',
  author: 'OB著者',
  publisher: 'OB出版',
  coverUrl: null,
};

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function setup(
  search: (keyword: string) => Promise<BookSearchResult>,
  lookup: (isbn: string) => Promise<BookLookupResult> = async () => ({ status: 'not_found' }),
  resolveCover: jest.Mock<Promise<string | null>, [string]> = jest.fn(async (_isbn: string) => null),
) {
  const searchFn = jest.fn(search);
  const lookupFn = jest.fn(lookup);
  const searchProvider: BookSearchProvider = { attribution: 'テスト利用表記', search: searchFn };
  const lookupProvider: BookLookupProvider = { lookupByIsbn: lookupFn };
  const view = await render(
    <BookLookupContextProvider provider={lookupProvider}>
      <CoverResolverContextProvider resolver={resolveCover}>
        <BookSearchContextProvider provider={searchProvider}>
          <TitleSearchScreen />
        </BookSearchContextProvider>
      </CoverResolverContextProvider>
    </BookLookupContextProvider>,
  );
  return { searchFn, lookupFn, view };
}

const ok = (...candidates: BookCandidate[]): BookSearchResult => ({ status: 'ok', candidates });
const enter = (text: string) =>
  fireEvent.changeText(screen.getByLabelText('タイトルのキーワード'), text);
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

// CI のカバレッジ計測下では初回描画が 5 秒を超えることがあるため
jest.setTimeout(30000);

beforeEach(() => jest.clearAllMocks());

describe('TitleSearchScreen の書影補完', () => {
  it('openBD に書影がなければ取得した URL を params に入れ、あれば取得しない', async () => {
    const resolveCover = jest.fn(async (_isbn: string) => 'https://cover/x.jpg');
    await setup(async () => ok(withIsbn), async () => ({ status: 'found', book }), resolveCover);
    await enter('本');
    await press(/検索/);
    fireEvent.press(await screen.findByRole('button', { name: /本A/ }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/record/new',
        params: expect.objectContaining({ coverUrl: 'https://cover/x.jpg' }),
      }),
    );
    expect(resolveCover).toHaveBeenCalledWith('9784065199817');
  });

  it('書影があれば取得しない', async () => {
    const resolveCover = jest.fn(async (_isbn: string) => 'https://cover/x.jpg');
    await setup(
      async () => ok(withIsbn),
      async () => ({ status: 'found', book: { ...book, coverUrl: 'https://o/c.jpg' } }),
      resolveCover,
    );
    await enter('本');
    await press(/検索/);
    fireEvent.press(await screen.findByRole('button', { name: /本A/ }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(resolveCover).not.toHaveBeenCalled();
  });
});

describe('TitleSearchScreen', () => {
  it('入力欄・検索ボタン・利用表記を表示し、入力中は Provider を呼ばない', async () => {
    const { searchFn } = await setup(async () => ok());
    expect(await screen.findByLabelText('タイトルのキーワード')).toBeTruthy();
    expect(screen.getByRole('button', { name: '検索' })).toBeTruthy();
    expect(screen.getByText('テスト利用表記')).toBeTruthy();
    await enter('ワン');
    expect(searchFn).not.toHaveBeenCalled();
  });

  it('検索ボタンで 1 回だけ search（trim 済み）を呼ぶ', async () => {
    const { searchFn } = await setup(async () => ok(withIsbn));
    await enter(' ワン ');
    await press('検索');
    expect(await screen.findByRole('button', { name: '本A' })).toBeTruthy();
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenCalledWith('ワン');
  });

  it('キーボード確定でも検索できる', async () => {
    const { searchFn } = await setup(async () => ok(withIsbn));
    await enter('ワン');
    await fireEvent(screen.getByLabelText('タイトルのキーワード'), 'submitEditing');
    expect(await screen.findByRole('button', { name: '本A' })).toBeTruthy();
    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('空のキーワードでは呼ばずにエラーを表示する', async () => {
    const { searchFn } = await setup(async () => ok());
    await enter('   ');
    await press('検索');
    expect(await screen.findByText('キーワードを入力してください')).toBeTruthy();
    expect(searchFn).not.toHaveBeenCalled();
  });

  it('検索中はローディングで無効化され、重ね押しでも 1 回しか呼ばれない', async () => {
    const d = deferred<BookSearchResult>();
    const { searchFn } = await setup(() => d.promise);
    await enter('ワン');
    await press('検索');
    await fireEvent(screen.getByLabelText('タイトルのキーワード'), 'submitEditing');
    expect(screen.getByRole('button', { name: '検索' })).toBeDisabled();
    expect(searchFn).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve(ok(withIsbn)));
    expect(await screen.findByRole('button', { name: '本A' })).toBeTruthy();
  });

  it('候補をタイトル・著者・出版社・出版年付きで表示し、null は表示しない', async () => {
    await setup(async () => ok(withIsbn, noIsbn));
    await enter('x');
    await press('検索');
    expect(await screen.findByText('出版A · 2020')).toBeTruthy();
    expect(screen.getByRole('button', { name: '本B' })).toBeTruthy();
    expect(screen.getByText('著者A')).toBeTruthy();
  });

  it('0 件のとき見つかりませんでしたと手入力を表示する', async () => {
    await setup(async () => ok());
    await enter('x');
    await press('検索');
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
    expect(screen.getByRole('button', { name: '見つからないので手で入力する' })).toBeTruthy();
  });

  it.each(['network', 'invalid_response'] as const)(
    'エラー(%s)のときメッセージと再試行を表示し、再試行で再検索する',
    async (reason) => {
      const { searchFn } = await setup(async () => ({ status: 'error', reason }));
      await enter('x');
      await press('検索');
      expect(
        await screen.findByText('検索できませんでした。通信状況を確認してください'),
      ).toBeTruthy();
      await press('再試行');
      expect(searchFn).toHaveBeenCalledTimes(2);
      expect(searchFn).toHaveBeenLastCalledWith('x');
      await press('見つからないので手で入力する');
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/record/new',
        params: { title: 'x' },
      });
    },
  );

  it('キーワードを編集すると結果が消える', async () => {
    await setup(async () => ok(withIsbn));
    await enter('x');
    await press('検索');
    expect(await screen.findByRole('button', { name: '本A' })).toBeTruthy();
    await enter('xy');
    expect(screen.queryByRole('button', { name: '本A' })).toBeNull();
  });

  it('ISBN あり候補は openBD の情報でフォームへ遷移する', async () => {
    const { lookupFn } = await setup(
      async () => ok(withIsbn),
      async () => ({ status: 'found', book }),
    );
    await enter('x');
    await press('検索');
    await press(/本A/);
    expect(lookupFn).toHaveBeenCalledWith('9784065199817');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { title: 'openBD の本', isbn: book.isbn, creator: 'OB著者',
        publisher: 'OB出版',
        sourceProvider: 'openbd',
        sourceId: book.isbn,
      },
    });
  });

  it.each([{ status: 'not_found' }, { status: 'error' }] as const)(
    'openBD が %o のとき候補の情報で遷移する',
    async (result) => {
      await setup(
        async () => ok(withIsbn),
        async () => result,
      );
      await enter('x');
      await press('検索');
      await press(/本A/);
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/record/new',
        params: {
          title: '本A',
          creator: '著者A',
          publisher: '出版A',
          isbn: '9784065199817',
          sourceProvider: 'openbd',
          sourceId: '9784065199817',
        },
      });
    },
  );

  it('詳細取得中は他の候補を押せない', async () => {
    const d = deferred<BookLookupResult>();
    const { lookupFn } = await setup(
      async () => ok(withIsbn, noIsbn),
      () => d.promise,
    );
    await enter('x');
    await press('検索');
    await press(/本A/);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
    await press(/本B/);
    expect(lookupFn).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => d.resolve({ status: 'not_found' }));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('ISBN なし候補は lookup を呼ばず候補の情報で遷移する', async () => {
    const { lookupFn } = await setup(async () => ok(noIsbn));
    await enter('x');
    await press('検索');
    await press(/本B/);
    expect(lookupFn).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { title: '本B' },
    });
  });

  it('手入力で続けるはキーワードをタイトルとして引き継ぐ（空ならパラメータなし）', async () => {
    await setup(async () => ok());
    await press('見つからないので手で入力する');
    expect(router.replace).toHaveBeenLastCalledWith({
      pathname: '/record/new',
      params: {},
    });
    await enter('ワン');
    await press('見つからないので手で入力する');
    expect(router.replace).toHaveBeenLastCalledWith({
      pathname: '/record/new',
      params: { title: 'ワン' },
    });
  });

  it('アンマウント後の検索結果は無視する', async () => {
    const d = deferred<BookSearchResult>();
    const { view } = await setup(() => d.promise);
    await enter('x');
    await press('検索');
    await view.unmount();
    await act(async () => d.resolve(ok(withIsbn)));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('アンマウント後の詳細取得結果では遷移しない', async () => {
    const d = deferred<BookLookupResult>();
    const { view } = await setup(
      async () => ok(withIsbn),
      () => d.promise,
    );
    await enter('x');
    await press('検索');
    await press(/本A/);
    await view.unmount();
    await act(async () => d.resolve({ status: 'found', book }));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('結果の件数見出しと、右端の › ・小さな書影つきの行を表示する', async () => {
    await setup(async () => ok(withIsbn, noIsbn));
    await enter(' ワン ');
    await press('検索');
    expect(await screen.findByText('「ワン」の検索結果 2 件')).toBeTruthy();
    expect(screen.getAllByText('›')).toHaveLength(2);
    // 見出しは検索したキーワード。入力を編集すると件数見出しも消える
    await enter('ワンピ');
    expect(screen.queryByText('「ワン」の検索結果 2 件')).toBeNull();
  });

  it('検索中は検索欄が編集不可になり、進行表示を出す', async () => {
    const d = deferred<BookSearchResult>();
    await setup(() => d.promise);
    await enter('ワン');
    await press('検索');
    expect(screen.getByLabelText('タイトルのキーワード').props.editable).toBe(false);
    await act(async () => d.resolve(ok()));
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
  });

  it('閉じるで戻る', async () => {
    await setup(async () => ok());
    await press('閉じる');
    expect(router.back).toHaveBeenCalled();
  });

  it('固定フッターに手入力ボタンと利用表記を出す', async () => {
    await setup(async () => ok());
    expect(screen.getByRole('button', { name: '見つからないので手で入力する' })).toBeTruthy();
    expect(screen.getByText('テスト利用表記')).toBeTruthy();
  });
});
