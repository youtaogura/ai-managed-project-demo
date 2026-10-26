import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { MediaSearchContextProvider } from '../../hooks/useMediaSearch';
import type { MediaSearchProvider } from '../../lib/mediaSearch/MediaSearchProvider';
import type { MediaCandidate, MediaSearchKind, MediaSearchResult } from '../../types/mediaSearch';
import { withSettings } from '../../testProviders';
import type { MediaKind } from '../../types/record';
import { MediaSearchScreen } from '../MediaSearchScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

const movie: MediaCandidate = {
  mediaType: 'movie',
  tmdbId: '603',
  title: 'マトリックス',
  creator: '監督A',
  year: '1999',
  posterUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
  isAnimation: false,
};
const tv: MediaCandidate = {
  mediaType: 'tv',
  tmdbId: '9',
  title: 'ドラマB',
  creator: null,
  year: null,
  posterUrl: null,
  isAnimation: true,
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
  search: (keyword: string, kind: MediaSearchKind) => Promise<MediaSearchResult>,
  kinds?: MediaKind[],
) {
  const searchFn = jest.fn(search);
  const provider: MediaSearchProvider = { attribution: 'テスト利用表記', search: searchFn };
  const screenElement = (
    <MediaSearchContextProvider provider={provider}>
      <MediaSearchScreen />
    </MediaSearchContextProvider>
  );
  await render(kinds ? withSettings(kinds, screenElement) : screenElement);
  return { searchFn };
}

const ok = (...candidates: MediaCandidate[]): MediaSearchResult => ({ status: 'ok', candidates });
const enter = (text: string) =>
  fireEvent.changeText(screen.getByLabelText('タイトルのキーワード'), text);
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

jest.setTimeout(30000);

beforeEach(() => jest.clearAllMocks());

describe('MediaSearchScreen（使う種別）', () => {
  it('種別チップは使う種別だけで、初期の種別は使う種別の先頭', async () => {
    const { searchFn } = await setup(async () => ok(), ['book', 'drama', 'anime']);
    expect(await screen.findByRole('radio', { name: 'ドラマ' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'ドラマ' }).props.accessibilityState.checked).toBe(
      true,
    );
    expect(screen.getByRole('radio', { name: 'アニメ' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: '映画' })).toBeNull();
    await enter('x');
    await press('検索');
    await waitFor(() => expect(searchFn).toHaveBeenCalledWith('x', 'drama'));
  });

  it('1 つだけのときはチップを出さず、その種別で検索する', async () => {
    const { searchFn } = await setup(async () => ok(), ['anime']);
    expect(await screen.findByLabelText('タイトルのキーワード')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    await enter('x');
    await press('検索');
    await waitFor(() => expect(searchFn).toHaveBeenCalledWith('x', 'anime'));
  });

  it('映画・ドラマ・アニメのどれも使わない設定でも、全部の種別を出す', async () => {
    await setup(async () => ok(), ['book']);
    expect(await screen.findByRole('radio', { name: '映画' })).toBeTruthy();
  });
});

describe('MediaSearchScreen', () => {
  it('入力欄・種別・検索ボタン・利用表記を表示し、初期の種別は映画', async () => {
    const { searchFn } = await setup(async () => ok());
    expect(await screen.findByLabelText('タイトルのキーワード')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '映画' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole('radio', { name: 'ドラマ' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'アニメ' })).toBeTruthy();
    expect(screen.getByText('テスト利用表記')).toBeTruthy();
    expect(searchFn).not.toHaveBeenCalled();
  });

  it('trim したキーワードと選択中の種別で search を呼び、結果を表示する', async () => {
    const { searchFn } = await setup(async () => ok(movie, tv));
    await fireEvent.press(screen.getByRole('radio', { name: 'アニメ' }));
    await enter(' マトリックス ');
    await press('検索');
    expect(await screen.findByRole('button', { name: 'マトリックス' })).toBeTruthy();
    expect(searchFn).toHaveBeenCalledWith('マトリックス', 'anime');
    expect(screen.getByText('「マトリックス」の検索結果 2 件')).toBeTruthy();
    expect(screen.getByText('1999 · 映画')).toBeTruthy();
    // チップ「アニメ」と、行の種別「アニメ」
    expect(screen.getAllByText('アニメ')).toHaveLength(2);
  });

  it('キーボード確定でも検索できる', async () => {
    const { searchFn } = await setup(async () => ok(movie));
    await enter('マ');
    await fireEvent(screen.getByLabelText('タイトルのキーワード'), 'submitEditing');
    expect(await screen.findByRole('button', { name: 'マトリックス' })).toBeTruthy();
    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('空のキーワードでは呼ばずにエラーを表示する', async () => {
    const { searchFn } = await setup(async () => ok());
    await enter('   ');
    await press('検索');
    expect(await screen.findByText('キーワードを入力してください')).toBeTruthy();
    expect(searchFn).not.toHaveBeenCalled();
  });

  it('検索中はインジケーターを出し、入力・ボタン・行を無効にする', async () => {
    const d = deferred<MediaSearchResult>();
    const { searchFn } = await setup(() => d.promise);
    await enter('x');
    await press('検索');
    expect(screen.getByLabelText('検索中')).toBeTruthy();
    expect(screen.getByLabelText('タイトルのキーワード').props.editable).toBe(false);
    await press('検索');
    await fireEvent.press(screen.getByRole('radio', { name: 'ドラマ' }));
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('radio', { name: 'ドラマ' }).props.accessibilityState.checked).toBe(
      false,
    );
    await d.resolve(ok(movie));
    expect(await screen.findByRole('button', { name: 'マトリックス' })).toBeTruthy();
  });

  it('0 件は「見つかりませんでした」', async () => {
    await setup(async () => ok());
    await enter('x');
    await press('検索');
    expect(await screen.findByText('見つかりませんでした')).toBeTruthy();
  });

  it('失敗すると案内と再試行を出し、再試行で同じ条件で再検索する', async () => {
    let fail = true;
    const { searchFn } = await setup(async () =>
      fail ? { status: 'error', reason: 'network' } : ok(movie),
    );
    await enter('x');
    await press('検索');
    expect(
      await screen.findByText('検索できませんでした。通信状況を確認してください'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '見つからないので手で入力する' })).toBeTruthy();
    fail = false;
    await press('再試行');
    expect(await screen.findByRole('button', { name: 'マトリックス' })).toBeTruthy();
    expect(searchFn).toHaveBeenLastCalledWith('x', 'movie');
  });

  it('種別を切り替えるとキーワードは残り、結果は消えて idle に戻る', async () => {
    await setup(async () => ok(movie));
    await enter('マトリックス');
    await press('検索');
    await screen.findByRole('button', { name: 'マトリックス' });
    await fireEvent.press(screen.getByRole('radio', { name: 'ドラマ' }));
    expect(screen.queryByRole('button', { name: 'マトリックス' })).toBeNull();
    expect(screen.getByLabelText('タイトルのキーワード').props.value).toBe('マトリックス');
  });

  it('入力を変えると結果が消える', async () => {
    await setup(async () => ok(movie));
    await enter('a');
    await press('検索');
    await screen.findByRole('button', { name: 'マトリックス' });
    await enter('ab');
    expect(screen.queryByRole('button', { name: 'マトリックス' })).toBeNull();
  });

  it('候補を選ぶと選んだ種別・取得元つきで追加画面へ replace し、二重タップは無視する', async () => {
    await setup(async () => ok(movie, tv));
    await fireEvent.press(screen.getByRole('radio', { name: 'アニメ' }));
    await enter('x');
    await press('検索');
    await fireEvent.press(await screen.findByRole('button', { name: 'ドラマB' }));
    await fireEvent.press(screen.getByRole('button', { name: 'マトリックス' }));
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: {
        kind: 'anime',
        title: 'ドラマB',
        sourceProvider: 'tmdb',
        sourceType: 'tv',
        sourceId: '9',
      },
    });
  });

  it('映画の候補はポスター・監督つき', async () => {
    await setup(async () => ok(movie));
    await enter('x');
    await press('検索');
    await fireEvent.press(await screen.findByRole('button', { name: 'マトリックス' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: {
        kind: 'movie',
        title: 'マトリックス',
        creator: '監督A',
        coverUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
        sourceProvider: 'tmdb',
        sourceType: 'movie',
        sourceId: '603',
      },
    });
  });

  it('「見つからないので手で入力する」は種別とキーワードで遷移する（source なし）', async () => {
    await setup(async () => ok());
    await fireEvent.press(screen.getByRole('radio', { name: 'ドラマ' }));
    await enter(' 手入力 ');
    await press('見つからないので手で入力する');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'drama', title: '手入力' },
    });
  });

  it('キーワードが空なら title を付けない', async () => {
    await setup(async () => ok());
    await press('見つからないので手で入力する');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/record/new',
      params: { kind: 'movie' },
    });
  });

  it('閉じるボタンで戻る', async () => {
    await setup(async () => ok());
    await press('閉じる');
    expect(router.back).toHaveBeenCalled();
  });
});

describe('MediaSearchScreen（Provider 未設定）', () => {
  it('検索しても落ちず、利用表記は出ない', async () => {
    await render(
      <MediaSearchContextProvider provider={null}>
        <MediaSearchScreen />
      </MediaSearchContextProvider>,
    );
    await enter('x');
    await press('検索');
    expect(screen.queryByLabelText('検索中')).toBeNull();
  });
});
