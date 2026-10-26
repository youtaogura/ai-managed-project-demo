import { Text } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { MediaSearchContextProvider } from '../../hooks/useMediaSearch';
import type { MediaSearchProvider } from '../../lib/mediaSearch/MediaSearchProvider';
import { withRepository, withSettings } from '../../testProviders';
import { createSortOrderStore, SORT_ORDER_STORAGE_KEY } from '../../lib/sortOrderStore';
import { createSettingsStore, SETTINGS_STORAGE_KEY } from '../../lib/settingsStore';
import { createFakeRepository, createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaKind, MediaRecord } from '../../types/record';
import type { RecordRepository } from '../../lib/recordRepository';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const records: MediaRecord[] = [
  makeRecord({
    id: 'a',
    title: 'アルファ',
    kind: 'book',
    status: 'completed',
    startDate: '2024-01-05',
    endDate: '2024-02-10',
    rating: 4,
  }),
  makeRecord({
    id: 'b',
    title: 'ベータ',
    kind: 'movie',
    status: 'planned',
    startDate: '2024-03-01',
  }),
  makeRecord({
    id: 'c',
    title: 'ガンマ',
    kind: 'anime',
    endDate: '2024-05-01',
    rating: 2.5,
  }),
];

function setup(
  repository: RecordRepository,
  storage = createMemoryStorage().storage,
  handlers: { onAdd?: () => void; onOpen?: (id: string) => void } = {},
  mediaProvider?: MediaSearchProvider | null,
) {
  return renderRouter({
    index: () =>
      withRepository(
        repository,
        <MediaSearchContextProvider provider={mediaProvider}>
          <RecordsScreen sortOrderStore={createSortOrderStore(storage)} {...handlers} />
        </MediaSearchContextProvider>,
      ),
    'record/new': () => <Text>ダミー手入力画面</Text>,
    'record/isbn': () => <Text>ダミーISBN画面</Text>,
    'record/search': () => <Text>ダミー検索画面</Text>,
    'record/media-search': () => <Text>ダミー作品検索画面</Text>,
    'record/scan': () => <Text>ダミー読取画面</Text>,
  });
}

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const thisYear = `${now.getFullYear()}`;

// 表示順を、書影（accessibilityLabel がタイトル）の並びで取る
const titles = () =>
  screen
    .getAllByRole('button', { name: /^(アルファ|ベータ|ガンマ)$/ })
    .map((n) => n.props.accessibilityLabel as string);

describe('RecordsScreen（使う種別）', () => {
  const setupKinds = (kinds: MediaKind[], repository: RecordRepository) =>
    renderRouter({
      index: () =>
        withSettings(
          kinds,
          withRepository(
            repository,
            <RecordsScreen sortOrderStore={createSortOrderStore(createMemoryStorage().storage)} />,
          ),
        ),
    });

  it('使わない種別の記録は一覧にも最近の段にも出ない。リポジトリは変わらない', async () => {
    const { repository } = createFakeRepository(records);
    await setupKinds(['book'], repository);
    await waitFor(() => expect(screen.getAllByLabelText('アルファ').length).toBeGreaterThan(0));
    expect(screen.queryByLabelText('ベータ')).toBeNull();
    expect(screen.queryByLabelText('ガンマ')).toBeNull();
    expect(await repository.getAll()).toHaveLength(3);
  });

  it('年・月のカウンターにも使わない種別の記録を数えない', async () => {
    const dated = [
      makeRecord({ id: 'b1', title: 'A', kind: 'book', endDate: `${thisMonth}-01` }),
      makeRecord({ id: 'm1', title: 'B', kind: 'movie', endDate: `${thisMonth}-01` }),
    ];
    await setupKinds(['book'], createFakeRepository(dated).repository);
    const month = thisMonth.endsWith('-01') ? 1 : 1;
    expect(await screen.findByLabelText(`今年 1 作品 · 今月 ${month}`)).toBeTruthy();
  });

  it('使う種別の記録が 0 件なら「記録なし」の状態を出す', async () => {
    await setupKinds(['manga'], createFakeRepository(records).repository);
    expect(await screen.findByText('最初の1作品を記録しよう')).toBeTruthy();
  });
});

describe('RecordsScreen', () => {
  it('読み込み中はインジケーターを表示し、完了後に切り替わる', async () => {
    const { repository } = createFakeRepository(records);
    await setup(repository);
    await waitFor(() => expect(screen.getAllByLabelText('アルファ').length).toBeGreaterThan(0));
    expect(screen.queryByLabelText('読み込み中')).toBeNull();
  });

  it('見出し「記録」と並び替え・記録するボタンを表示する', async () => {
    await setup(createFakeRepository(records).repository);
    expect(await screen.findByText('記録')).toBeTruthy();
    expect(screen.getByRole('button', { name: '並び替え' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '記録する' })).toBeTruthy();
  });

  it('今年・今月に終了日のある記録の数を表示する', async () => {
    const dated = [
      makeRecord({ id: 'y1', title: 'A', endDate: `${thisMonth}-01` }),
      makeRecord({ id: 'y2', title: 'B', endDate: `${thisYear}-01-01` }),
      makeRecord({ id: 'o1', title: 'C', endDate: '1999-05-05' }),
      makeRecord({ id: 'n1', title: 'D', endDate: null }),
    ];
    await setup(createFakeRepository(dated).repository);
    const expectedMonth = thisMonth.endsWith('-01') ? 2 : 1;
    expect(await screen.findByLabelText(`今年 2 作品 · 今月 ${expectedMonth}`)).toBeTruthy();
  });

  it('「最近読み終えた・見終えた」に終了日の新しい順で最大10件並ぶ', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeRecord({ id: `m${i}`, title: `作品${pad(i)}`, endDate: `2020-01-${pad(i + 1)}` }),
    );
    await setup(createFakeRepository(many).repository);
    expect(await screen.findByText('最近読み終えた・見終えた')).toBeTruthy();
    // hero は終了日を表示する。2020-01-12 が最新、2020-01-03 が 10 件目
    expect(screen.getByText('2020-01-12')).toBeTruthy();
    expect(screen.getByText('2020-01-03')).toBeTruthy();
    expect(screen.queryByText('2020-01-02')).toBeNull();
    expect(screen.queryByText('2020-01-01')).toBeNull();
  });

  it('終了日のある記録がなければ「最近読み終えた・見終えた」は出ない', async () => {
    await setup(
      createFakeRepository([makeRecord({ id: 'p', title: 'ベータ', endDate: null })]).repository,
    );
    expect(await screen.findByText('すべての記録')).toBeTruthy();
    expect(screen.queryByText('最近読み終えた・見終えた')).toBeNull();
  });

  it('既定は終了日の新しい順で、並び順を見出しの右に出す', async () => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    expect(screen.getByText('終了日が新しい順')).toBeTruthy();
    const grid = titles();
    expect(grid.slice(-3)).toEqual(['ガンマ', 'アルファ', 'ベータ']);
  });

  it('並び替えシートで選ぶと一覧が変わり、シートが閉じる', async () => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '並び替え' }));
    expect(screen.getByText('レーティング')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '低い順' }));
    expect(screen.getByText('評価が低い順')).toBeTruthy();
    expect(titles().slice(-3)).toEqual(['ガンマ', 'アルファ', 'ベータ']);
    expect(screen.queryByText('レーティング')).toBeNull();
  });

  it('並び順は再マウント後も維持される', async () => {
    const { storage } = createMemoryStorage();
    const { repository } = createFakeRepository(records);
    await setup(repository, storage);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '並び替え' }));
    await fireEvent.press(screen.getByRole('radio', { name: '高い順' }));
    await screen.unmount();

    await setup(repository, storage);
    await waitFor(() => expect(screen.getByText('評価が高い順')).toBeTruthy());
    expect(titles().slice(-3)).toEqual(['アルファ', 'ガンマ', 'ベータ']);
  });

  it('書影をタップすると onOpen が id 付きで呼ばれる', async () => {
    const onOpen = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onOpen });
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getAllByLabelText('ベータ')[0]);
    expect(onOpen).toHaveBeenCalledWith('b');
  });

  it('コールバック未指定でもタップで落ちない', async () => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getAllByLabelText('ベータ')[0]);
  });

  it('0 件のときは空の表示が出て、「記録する」で追加シートが開く', async () => {
    await setup(createFakeRepository().repository);
    expect(await screen.findByText('最初の1作品を記録しよう')).toBeTruthy();
    expect(screen.queryByText('何を記録しますか')).toBeNull();
    await fireEvent.press(screen.getAllByRole('button', { name: '記録する' }).slice(-1)[0]);
    expect(screen.getByText('何を記録しますか')).toBeTruthy();
  });

  it('＋ボタンで追加シートが開き、旧デザインの追加ボタンはない', async () => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    expect(screen.queryByRole('button', { name: '手入力で追加' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    expect(screen.getByText('何を記録しますか')).toBeTruthy();
  });

  it.each([
    ['バーコードを読み取る', '/record/scan'],
    ['本をタイトルで探す', '/record/search'],
    ['ISBN を入力する', '/record/isbn'],
  ])('追加シートの「%s」で %s へ遷移する', async (label, path) => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    await fireEvent.press(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(screen).toHavePathname(path));
  });

  it('追加シートの「手で入力する」で onAdd が呼ばれ、シートが閉じる', async () => {
    const onAdd = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onAdd });
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    await fireEvent.press(screen.getByRole('button', { name: '本を手で入力する' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('何を記録しますか')).toBeNull();
  });

  const mediaProvider: MediaSearchProvider = {
    attribution: 'x',
    search: async () => ({ status: 'ok', candidates: [] }),
  };

  it('キーがあれば「映画・ドラマ・アニメをタイトルで探す」で作品検索へ遷移する', async () => {
    await setup(createFakeRepository(records).repository, undefined, {}, mediaProvider);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    await fireEvent.press(
      screen.getByRole('button', { name: '映画・ドラマ・アニメをタイトルで探す' }),
    );
    await waitFor(() => expect(screen).toHavePathname('/record/media-search'));
  });

  it('キーがなければ作品の「タイトルで探す」は出ず、手入力は使える', async () => {
    await setup(createFakeRepository(records).repository, undefined, {}, null);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    expect(
      screen.queryByRole('button', { name: '映画・ドラマ・アニメをタイトルで探す' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: '本をタイトルで探す' })).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: '映画・ドラマ・アニメを手で入力する' }),
    );
    await waitFor(() => expect(screen).toHavePathname('/record/new'));
    expect(screen).toHaveSearchParams({ kind: 'movie' });
  });

  it('下の段の手入力は onAdd を呼ばない', async () => {
    const onAdd = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onAdd });
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    await fireEvent.press(
      screen.getByRole('button', { name: '映画・ドラマ・アニメを手で入力する' }),
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('onAdd 未指定でも「手で入力する」を押して落ちない', async () => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    await fireEvent.press(screen.getByRole('button', { name: '本を手で入力する' }));
    expect(screen.getAllByLabelText('ベータ').length).toBeGreaterThan(0);
  });

  it('追加シートを閉じるボタンで閉じられる', async () => {
    await setup(createFakeRepository(records).repository);
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '記録する' }));
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByText('何を記録しますか')).toBeNull();
  });
});

describe('RecordsScreen（記録する項目のオフ）', () => {
  const KINDS: MediaKind[] = ['book', 'manga', 'movie', 'drama', 'anime'];
  const setupFields = (
    fields: Parameters<typeof withSettings>[2],
    repository: RecordRepository,
    storage = createMemoryStorage().storage,
  ) =>
    renderRouter({
      index: () =>
        withSettings(
          KINDS,
          withRepository(
            repository,
            <RecordsScreen sortOrderStore={createSortOrderStore(storage)} />,
          ),
          fields,
        ),
    });
  const storageWith = (order: string) =>
    createMemoryStorage({ [SORT_ORDER_STORAGE_KEY]: order }).storage;

  it('終えた日・始めた日・レーティングがオフなら並び替えの行が出ない', async () => {
    await setupFields(
      { endDate: false, startDate: false, rating: false },
      createFakeRepository(records).repository,
    );
    await screen.findByText('すべての記録');
    await fireEvent.press(screen.getByRole('button', { name: '並び替え' }));
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.getByText('登録日時')).toBeTruthy();
    expect(screen.queryByText('終了日')).toBeNull();
    expect(screen.queryByText('開始日')).toBeNull();
    expect(screen.queryByText('レーティング')).toBeNull();
  });

  it('保存された並び順がオフの項目のものなら、初期の並び順で並ぶ。保存値は変えない', async () => {
    const storage = storageWith('rating_asc');
    await setupFields({ rating: false }, createFakeRepository(records).repository, storage);
    expect(await screen.findByText('終了日が新しい順')).toBeTruthy();
    expect(titles().slice(-3)).toEqual(['ガンマ', 'アルファ', 'ベータ']);
    expect(await storage.getItem(SORT_ORDER_STORAGE_KEY)).toBe('rating_asc');
  });

  it('終えた日がオフなら初期の並び順は登録が新しい順', async () => {
    await setupFields(
      { endDate: false },
      createFakeRepository(records).repository,
      storageWith('endDate_asc'),
    );
    expect(await screen.findByText('登録が新しい順')).toBeTruthy();
  });

  it('オフにしていない項目の並び順は保たれる', async () => {
    await setupFields(
      { startDate: false },
      createFakeRepository(records).repository,
      storageWith('rating_desc'),
    );
    expect(await screen.findByText('評価が高い順')).toBeTruthy();
    expect(titles().slice(-3)).toEqual(['アルファ', 'ガンマ', 'ベータ']);
  });

  it('終えた日がオフなら、完了済みの記録が登録日時で最近の段・カウンターに入る', async () => {
    const created = (iso: string) => new Date(iso).toISOString();
    const dated = [
      makeRecord({
        id: 'a',
        title: 'アルファ',
        status: 'completed',
        endDate: null,
        createdAt: created(`${thisMonth}-10T12:00:00`),
      }),
      makeRecord({
        id: 'b',
        title: 'ベータ',
        status: 'planned',
        endDate: `${thisMonth}-01`,
        createdAt: created(`${thisMonth}-11T12:00:00`),
      }),
    ];
    await setupFields({ endDate: false }, createFakeRepository(dated).repository);
    expect(await screen.findByText('最近読み終えた・見終えた')).toBeTruthy();
    expect(screen.getByLabelText('今年 1 作品 · 今月 1')).toBeTruthy();
  });

  it('終えた日がオフで完了済みの記録がなければ最近の段を出さない', async () => {
    await setupFields({ endDate: false }, createFakeRepository(records.slice(1, 2)).repository);
    expect(await screen.findByText('すべての記録')).toBeTruthy();
    expect(screen.queryByText('最近読み終えた・見終えた')).toBeNull();
  });
});

describe('RecordsScreen（上に大きく出す作品）', () => {
  const setupHero = (criterion: string, data: MediaRecord[]) =>
    renderRouter({
      index: () =>
        withSettings(
          createSettingsStore(
            createMemoryStorage({
              [SETTINGS_STORAGE_KEY]: JSON.stringify({ heroCriterion: criterion }),
            }).storage,
          ),
          withRepository(
            createFakeRepository(data).repository,
            <RecordsScreen sortOrderStore={createSortOrderStore(createMemoryStorage().storage)} />,
          ),
        ),
    });

  it('初期値では「最近読み終えた・見終えた」を出す', async () => {
    await setup(createFakeRepository(records).repository);
    expect(await screen.findByText('最近読み終えた・見終えた')).toBeTruthy();
  });

  it('条件に合わせて見出しと作品が変わる', async () => {
    await setupHero('planned', records);
    expect(await screen.findByText('読みたい・見たい')).toBeTruthy();
    expect(screen.queryByText('最近読み終えた・見終えた')).toBeNull();
    // ベータ（planned）は hero と一覧の 2 か所に出る
    expect(screen.getAllByLabelText('ベータ')).toHaveLength(2);
    expect(screen.getAllByLabelText('アルファ')).toHaveLength(1);
  });

  it('条件に合う作品がないとき、見出しも段も出ない', async () => {
    await setupHero('inProgress', records);
    expect(await screen.findByText('すべての記録')).toBeTruthy();
    expect(screen.queryByText('今読んでる・見てる')).toBeNull();
  });

  it('none では段を出さない', async () => {
    await setupHero('none', records);
    expect(await screen.findByText('すべての記録')).toBeTruthy();
    expect(screen.queryByText('最近読み終えた・見終えた')).toBeNull();
    expect(screen.getAllByLabelText('アルファ')).toHaveLength(1);
  });
});
