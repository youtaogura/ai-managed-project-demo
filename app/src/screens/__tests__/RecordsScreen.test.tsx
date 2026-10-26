import { StyleSheet, Text } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { withRepository } from '../../testProviders';
import { createSortOrderStore } from '../../lib/sortOrderStore';
import { createFakeRepository, createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import type { RecordRepository } from '../../lib/recordRepository';
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
  onOpen?: (id: string) => void;
  onCreateShelf?: () => void;
};

function setup(
  repository: RecordRepository,
  storage = createMemoryStorage().storage,
  handlers: Handlers = {},
) {
  return renderRouter({
    index: () =>
      withRepository(
        repository,
        <RecordsScreen sortOrderStore={createSortOrderStore(storage)} {...handlers} />,
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

  it('凡例とチップの行を表示し、「＋ 本棚を作る」は未指定でも落ちない', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(screen.getByText('お気に入り')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'すべての本' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '本棚を作る' }));
  });

  it('「＋ 本棚を作る」で onCreateShelf が呼ばれる', async () => {
    const onCreateShelf = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onCreateShelf });
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '本棚を作る' }));
    expect(onCreateShelf).toHaveBeenCalledTimes(1);
  });

  it('既定は終了日の新しい順', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    expect(titles().slice(0, 2)).toEqual(['ガンマ', 'アルファ']);
  });

  it('並び替えシートで選ぶと並びが変わり、背表紙の大きさは変わらない', async () => {
    await setup(createFakeRepository(records).repository);
    await ready();
    const before = { a: spineBox('アルファ'), c: spineBox('ガンマ') };
    const order = titles();
    await fireEvent.press(screen.getByRole('button', { name: '並び替え' }));
    expect(screen.getByText('レーティング')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '高い順' }));
    expect(screen.queryByText('レーティング')).toBeNull();
    expect(titles()).not.toEqual(order);
    expect({ a: spineBox('アルファ'), c: spineBox('ガンマ') }).toEqual(before);
  });

  it('並び順は再マウント後も維持される', async () => {
    const { storage } = createMemoryStorage();
    const { repository } = createFakeRepository(records);
    await setup(repository, storage);
    await ready();
    await fireEvent.press(screen.getByRole('button', { name: '並び替え' }));
    await fireEvent.press(screen.getByRole('radio', { name: '高い順' }));
    await screen.unmount();

    await setup(repository, storage);
    await ready();
    await waitFor(() => expect(titles().slice(0, 2)).toEqual(['アルファ', 'ガンマ']));
  });

  it('背表紙をタップすると onOpen が id 付きで呼ばれる', async () => {
    const onOpen = jest.fn();
    await setup(createFakeRepository(records).repository, undefined, { onOpen });
    await ready();
    await fireEvent.press(screen.getByLabelText('ベータ、読みたい'));
    expect(onOpen).toHaveBeenCalledWith('b');
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
