import { StyleSheet, Text } from 'react-native';
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { withRepository } from '../../testProviders';
import { createSortOrderStore, SORT_ORDER_STORAGE_KEY } from '../../lib/sortOrderStore';
import { createFakeRepository, createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import type { RecordRepository } from '../../lib/recordRepository';
import { createShelfRepository, type ShelfRepository } from '../../lib/shelfRepository';
import { RecordsScreen } from '../RecordsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const records: MediaRecord[] = [
  makeRecord({
    id: 'a',
    title: 'アルファ',
    status: 'completed',
    startDate: '2024-01-05',
    endDate: '2024-02-10',
    rating: 4,
  }),
  makeRecord({ id: 'b', title: 'ベータ', status: 'planned', startDate: '2024-03-01' }),
  makeRecord({
    id: 'c',
    title: 'ガンマ',
    status: 'completed',
    endDate: '2024-05-01',
    rating: 2.5,
  }),
  makeRecord({ id: 'd', title: 'デルタ', status: 'in_progress', creator: '作者D' }),
  makeRecord({ id: 'e', title: 'イプシロン', status: 'dropped' }),
];

type Handlers = {
  onAdd?: () => void;
  onOpen?: (record: MediaRecord) => void;
};

function setup(
  repository: RecordRepository,
  storage = createMemoryStorage().storage,
  handlers: Handlers = {},
  shelfRepository: ShelfRepository = createShelfRepository(createMemoryStorage().storage),
) {
  return renderRouter({
    index: () =>
      withRepository(
        repository,
        <RecordsScreen sortOrderStore={createSortOrderStore(storage)} {...handlers} />,
        undefined,
        undefined,
        shelfRepository,
      ),
    'record/new': () => <Text>ダミー手入力画面</Text>,
    'record/isbn': () => <Text>ダミーISBN画面</Text>,
    'record/search': () => <Text>ダミー検索画面</Text>,
    'record/media-search': () => <Text>ダミー作品検索画面</Text>,
    'record/scan': () => <Text>ダミー読取画面</Text>,
  });
}

const spineLabels = () =>
  screen
    .getAllByRole('button', { name: /、(読んでる|読んだ|読みたい|途中でやめた)/ })
    .map((n) => n.props.accessibilityLabel as string);

const titles = () => spineLabels().map((label) => label.split('、')[0]);

const spineBox = (title: string) => {
  const style = StyleSheet.flatten(
    screen.getByRole('button', { name: new RegExp(`^${title}、`) }).props.style,
  );
  return { width: style.width, height: style.height };
};

async function ready() {
  await screen.findByText('本棚');
  await waitFor(() => expect(screen.getAllByLabelText(/^アルファ、/).length).toBeGreaterThan(0));
}

describe('RecordsScreen', () => {
  it('読み込み中はインジケーターを表示し、完了後に切り替わる', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(screen.queryByLabelText('読み込み中')).toBeNull();
  });

  it('見出し「本棚」と全冊数・今年読んだ冊数を表示する', async () => {
    const year = new Date().getFullYear();
    const dated = [
      makeRecord({ id: 'y1', title: 'A', status: 'completed', endDate: `${year}-01-01` }),
      makeRecord({ id: 'y2', title: 'B', status: 'completed', endDate: `${year}-02-01` }),
      makeRecord({ id: 'o1', title: 'C', status: 'completed', endDate: '1999-05-05' }),
      makeRecord({ id: 'n1', title: 'D', status: 'planned', endDate: null }),
    ];
    await setup(createFakeRepository(dated).repository);
    expect(await screen.findByText('4 冊 · 今年読んだ 2 冊')).toBeTruthy();
    expect(screen.getByText('本棚')).toBeTruthy();
  });

  it('冊数は絞り込みの影響を受けない', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('tab', { name: /^読みたい/ }));
    expect(screen.getByText(/^5 冊 · 今年読んだ/)).toBeTruthy();
  });

  it('ステータスのタブは件数つきで、初期値は「すべて」', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'すべて 5' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByRole('tab', { name: '読んでる 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '読んだ 2' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '読みたい 1' })).toBeTruthy();
    expect(titles()).toHaveLength(5);
  });

  it('タブを押すとその状態の本だけが並び、件数は変わらない', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('tab', { name: '読んだ 2' }));
    expect(screen.getByRole('tab', { name: '読んだ 2' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(titles().sort()).toEqual(['アルファ', 'ガンマ']);
    await fireEvent.press(screen.getByRole('tab', { name: '読んでる 1' }));
    expect(titles()).toEqual(['デルタ']);
    await fireEvent.press(screen.getByRole('tab', { name: '読みたい 1' }));
    expect(titles()).toEqual(['ベータ']);
    expect(screen.getByRole('tab', { name: 'すべて 5' })).toBeTruthy();
  });

  it('途中でやめた本は「すべて」にだけ出る', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(titles()).toContain('イプシロン');
    for (const name of ['読んでる 1', '読んだ 2', '読みたい 1']) {
      await fireEvent.press(screen.getByRole('tab', { name }));
      expect(titles()).not.toContain('イプシロン');
    }
  });

  it('絞り込んだ結果が 0 冊のときは案内を出す', async () => {
    await setup(
      createFakeRepository([makeRecord({ id: 'p', title: 'ベータ', status: 'planned' })])
        .repository,
    );
    await screen.findByText('本棚');
    await fireEvent.press(await screen.findByRole('tab', { name: '読んだ 0' }));
    expect(screen.getByText('この状態の本はまだありません')).toBeTruthy();
    expect(screen.queryByTestId('shelf-board')).toBeNull();
  });

  it('凡例とチップの行を表示する', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(screen.getByText('お気に入り')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'すべての本' })).toBeTruthy();
  });

  it('「＋ 本棚を作る」で本棚を作るシートが開く', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本棚を作る' }));
    expect(await screen.findByLabelText('名前')).toBeTruthy();
  });

  it('既定は終了日の新しい順', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(titles().slice(0, 2)).toEqual(['ガンマ', 'アルファ']);
  });

  it('並び替えボタンはなく、保存された並び順で並ぶ（背表紙の大きさは変わらない）', async () => {
    const { repository } = createFakeRepository(records);
    await setup(repository);
    await ready();
    const before = { a: spineBox('アルファ'), c: spineBox('ガンマ') };
    const order = titles();
    expect(screen.queryByRole('button', { name: '並び替え' })).toBeNull();
    await screen.unmount();

    const { storage } = createMemoryStorage({ [SORT_ORDER_STORAGE_KEY]: 'rating_desc' });
    await setup(repository, storage);
    await ready();
    await waitFor(() => expect(titles()).not.toEqual(order));
    expect(titles().slice(0, 2)).toEqual(['アルファ', 'ガンマ']);
    expect({ a: spineBox('アルファ'), c: spineBox('ガンマ') }).toEqual(before);
  });

  it('背表紙をタップすると onOpen が記録付きで呼ばれる', async () => {
    const onOpen = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onOpen });
    await ready();
    await fireEvent.press(screen.getByLabelText('ベータ、読みたい'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', status: 'planned' }));
  });

  it('コールバック未指定でもタップで落ちない', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByLabelText('ベータ、読みたい'));
  });

  it('0 件のときは見出し・追加ボタン・空の表示が出て、「本を追加する」で追加シートが開く', async () => {
    await setup(createFakeRepository().repository);
    expect(await screen.findByText('最初の1冊を、棚に並べよう')).toBeTruthy();
    expect(screen.getByText('本棚')).toBeTruthy();
    expect(screen.getByRole('button', { name: '本を追加' })).toBeTruthy();
    expect(screen.queryByText('何を記録しますか')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '本を追加する' }));
    expect(screen.getByText('何を記録しますか')).toBeTruthy();
  });

  it('追加ボタンで追加シートが開く', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本を追加' }));
    expect(screen.getByText('何を記録しますか')).toBeTruthy();
  });

  it.each([
    ['バーコードを読み取る', '/record/scan'],
    ['本をタイトルで探す', '/record/search'],
    ['ISBN を入力する', '/record/isbn'],
  ])('追加シートの「%s」で %s へ遷移する', async (label, path) => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本を追加' }));
    await fireEvent.press(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(screen).toHavePathname(path));
  });

  it('追加シートの「手で入力する」で onAdd が呼ばれ、シートが閉じる', async () => {
    const onAdd = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onAdd });
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本を追加' }));
    await fireEvent.press(screen.getByRole('button', { name: '本を手で入力する' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('何を記録しますか')).toBeNull();
  });

  it('onAdd 未指定でも「手で入力する」を押して落ちない', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本を追加' }));
    await fireEvent.press(screen.getByRole('button', { name: '本を手で入力する' }));
    expect(screen.getByLabelText('ベータ、読みたい')).toBeTruthy();
  });

  it('追加シートを閉じるボタンで閉じられる', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本を追加' }));
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByText('何を記録しますか')).toBeNull();
  });
});

describe('RecordsScreen の本棚', () => {
  const shelfRecords: MediaRecord[] = [
    makeRecord({ id: 'a', title: 'アルファ', status: 'completed', endDate: '2024-02-10', shelfIds: ['sf'] }),
    makeRecord({ id: 'b', title: 'ベータ', status: 'planned', shelfIds: ['sf', 'ph'] }),
    makeRecord({ id: 'c', title: 'ガンマ', status: 'completed', endDate: '2024-05-01', shelfIds: ['ph'] }),
    makeRecord({ id: 'd', title: 'デルタ', status: 'in_progress' }),
  ];

  async function withShelves(extra: Record<string, string> = {}) {
    const shelfRepository = createShelfRepository(createMemoryStorage(extra).storage, {
      generateId: () => 'new-shelf',
    });
    await shelfRepository.importShelves(
      [
        { id: 'sf', name: 'SF', order: 0 },
        { id: 'ph', name: '哲学', order: 1 },
        { id: 'empty', name: 'からっぽ', order: 2 },
      ],
      'replace',
    );
    return shelfRepository;
  }

  const selected = (name: string) =>
    screen.getByRole('button', { name }).props.accessibilityState.selected as boolean;

  it('作った本棚がチップに順番に出て、初期値は「すべての本」', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, shelfRepository);
    await screen.findByRole('button', { name: 'SF' });
    expect(selected('すべての本')).toBe(true);
    expect(selected('SF')).toBe(false);
    expect(titles()).toHaveLength(4);
  });

  it('チップで本棚を選ぶとその本だけが並び、複数の本棚に入った本はどちらでも出る', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, shelfRepository);
    await fireEvent.press(await screen.findByRole('button', { name: 'SF' }));
    expect(selected('SF')).toBe(true);
    expect(selected('すべての本')).toBe(false);
    expect(titles().sort()).toEqual(['アルファ', 'ベータ']);
    await fireEvent.press(screen.getByRole('button', { name: '哲学' }));
    expect(titles().sort()).toEqual(['ガンマ', 'ベータ']);
    await fireEvent.press(screen.getByRole('button', { name: 'すべての本' }));
    expect(titles()).toHaveLength(4);
  });

  it('ステータスと組み合わせられ、タブの件数は本棚の中で数え、見出しは全記録のまま', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, shelfRepository);
    await fireEvent.press(await screen.findByRole('button', { name: '哲学' }));
    expect(screen.getByRole('tab', { name: 'すべて 2' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '読んだ 1' })).toBeTruthy();
    expect(screen.getByText(/^4 冊 · 今年読んだ/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: '読んだ 1' }));
    expect(titles()).toEqual(['ガンマ']);
    await fireEvent.press(screen.getByRole('tab', { name: '読んでる 0' }));
    expect(screen.getByText('この状態の本はまだありません')).toBeTruthy();
  });

  it('本が 1 冊も入っていない本棚では専用の案内を出す', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, shelfRepository);
    await fireEvent.press(await screen.findByRole('button', { name: 'からっぽ' }));
    expect(screen.getByText('この本棚にはまだ本がありません')).toBeTruthy();
  });

  it('本棚を作ると、チップの末尾に増えてその本棚が選ばれる。同じ名前は作れない', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, shelfRepository);
    await fireEvent.press(await screen.findByRole('button', { name: '本棚を作る' }));
    await fireEvent.changeText(await screen.findByLabelText('名前'), 'ｓｆ');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByText('同じ名前の本棚があります')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('名前'), '仕事の本');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    await waitFor(() => expect(selected('仕事の本')).toBe(true));
    expect(screen.getByText('この本棚にはまだ本がありません')).toBeTruthy();
    expect((await shelfRepository.getAll()).map((x) => x.name)).toEqual(['SF', '哲学', 'からっぽ', '仕事の本']);
  });

  it('選択中の本棚が管理画面で消えたあと画面に戻ると、「すべての本」に戻り本は残る', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, shelfRepository);
    await fireEvent.press(await screen.findByRole('button', { name: 'SF' }));
    expect(titles()).toHaveLength(2);
    await act(async () => {
      router.push('/record/new');
    });
    await screen.findByText('ダミー手入力画面');
    await act(async () => {
      await shelfRepository.delete('sf');
    });
    await act(async () => {
      router.back();
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'SF' })).toBeNull());
    expect(selected('すべての本')).toBe(true);
    expect(titles()).toHaveLength(4);
  });

  it('本棚の読み込みに失敗しても、本棚 0 件として表示する', async () => {
    const shelfRepository = await withShelves();
    const failing: ShelfRepository = { ...shelfRepository, getAll: () => Promise.reject(new Error('x')) };
    await setup(createFakeRepository(shelfRecords).repository, undefined, {}, failing);
    await ready().catch(() => undefined);
    await waitFor(() => expect(titles()).toHaveLength(4));
    expect(screen.queryByRole('button', { name: 'SF' })).toBeNull();
  });

  it('本が 0 冊のときは本棚のチップを出さない', async () => {
    const shelfRepository = await withShelves();
    await setup(createFakeRepository([]).repository, undefined, {}, shelfRepository);
    await screen.findByText('最初の1冊を、棚に並べよう');
    expect(screen.queryByRole('button', { name: 'すべての本' })).toBeNull();
  });
});
