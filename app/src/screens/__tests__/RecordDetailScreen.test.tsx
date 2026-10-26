import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import { Linking, ScrollView } from 'react-native';
import { triggerImpactHaptic } from '../../lib/haptics';
import type { PhotoService } from '../../lib/photo/PhotoService';
import type { RecordRepository } from '../../lib/recordRepository';
import type { MediaRecord } from '../../types/record';
import { createShelfRepository, type ShelfRepository } from '../../lib/shelfRepository';
import { withRepository } from '../../testProviders';
import { createFakeRepository, createMemoryStorage, createMockPhotoService, makeRecord } from '../../testUtils';
import { RecordDetailScreen } from '../RecordDetailScreen';

type TestInstance = ReturnType<typeof screen.getByText>;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../lib/haptics', () => ({
  triggerImpactHaptic: jest.fn(),
  triggerRatingHaptic: jest.fn(),
}));

function renderDetail(repository: RecordRepository, element: ReactElement, photoService?: PhotoService) {
  return renderRouter({
    index: () => withRepository(repository, element, photoService),
  });
}

const full = makeRecord({
  id: 'x',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  publisher: '新潮社',
  isbn: '9784101010014',
  startDate: '2024-01-05',
  endDate: '2024-02-10',
  status: 'completed',
  rating: 4.5,
  oneLiner: '一行目\n二行目',
});

const PHOTO = 'file:///documents/photos/p.jpg';

// 初回描画が重く、CI のコールドスタートで 5 秒を超えることがある
jest.setTimeout(15000);

afterEach(() => jest.clearAllMocks());

async function show(record = full, photoService?: PhotoService, onDeleted = jest.fn()) {
  const fake = createFakeRepository([record]);
  await renderDetail(fake.repository, <RecordDetailScreen recordId="x" onDeleted={onDeleted} />, photoService);
  await waitFor(() => expect(screen.getAllByText(record.title, { exact: false })).toBeTruthy());
  return { ...fake, onDeleted };
}

describe('RecordDetailScreen の表示', () => {
  it('タイトル・作者・評価・InfoCell を出す', async () => {
    await show();
    expect(screen.getAllByText('夏目漱石').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('レーティング 4.5')).toBeTruthy();
    expect(screen.getByText('読み終わった')).toBeTruthy();
    expect(screen.getByText('読み始めた')).toBeTruthy();
    expect(screen.getByText('読み終えた')).toBeTruthy();
    expect(screen.getByText('2024-01-05')).toBeTruthy();
    expect(screen.getByText('2024-02-10')).toBeTruthy();
  });

  it('映画・ドラマ・アニメの文言や「種別」は出ない', async () => {
    await show();
    expect(screen.queryByText('見始めた')).toBeNull();
    expect(screen.queryByText('見終えた')).toBeNull();
    expect(screen.queryByText('種別')).toBeNull();
    expect(screen.queryByText('監督など')).toBeNull();
  });

  it('評価・日付・作者が空なら星を出さず、日付は「—」', async () => {
    await show(makeRecord({ id: 'x', title: '空' }));
    expect(screen.queryByLabelText(/レーティング/)).toBeNull();
    expect(screen.getAllByText('—').length).toBe(2);
    expect(screen.queryByText('感想', { exact: false })).toBeNull();
  });

  it('感想の表示はなく、ひとこと（oneLiner）も今の画面には出さない', async () => {
    await show();
    expect(screen.queryByText('一行目\n二行目')).toBeNull();
  });

  it('作品の情報に空でない項目だけ出す', async () => {
    await show();
    for (const text of ['作者・著者', '出版社', '新潮社', 'ISBN', '9784101010014', '登録日時', '更新日時']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['写真', makeRecord({ id: 'x', title: 'P', photoUri: PHOTO })],
    [
      '書影 URL',
      makeRecord({
        id: 'x',
        title: 'C',
        coverUrl: 'https://example.com/c.jpg',
      }),
    ],
  ])('表紙: %s がある記録は画像を出す', async (_name, record) => {
    await show(record);
    expect(screen.getAllByLabelText(record.title).length).toBeGreaterThan(0);
  });

  it('表紙: 画像がなければ文字の表紙を出す', async () => {
    await show(makeRecord({ id: 'x', title: '文字だけ' }));
    expect(screen.queryByLabelText('文字だけ')).toBeNull();
  });

  it('「作品の情報」で、情報セクションの位置（body の位置を含む）へスクロールする', async () => {
    await show();
    const scrollTo = jest.fn();
    Object.defineProperty(ScrollView.prototype, 'scrollTo', {
      value: scrollTo,
      configurable: true,
    });
    const layout = (y: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 100, height: 100 } },
    });
    const withLayout = (start: TestInstance | null) => {
      let node = start;
      while (node && node.props.onLayout === undefined) node = node.parent;
      return node;
    };
    const body = withLayout(screen.getAllByText('ステータス')[0].parent);
    const info = withLayout(screen.getByText('出版社').parent);
    if (!body || !info) throw new Error('onLayout の View が見つからない');
    await fireEvent(body, 'layout', layout(500));
    await fireEvent(info, 'layout', layout(300));
    await fireEvent.press(screen.getByRole('button', { name: '作品の情報' }));
    expect(scrollTo).toHaveBeenCalledWith({ y: 800, animated: true });
  });
});

describe('書き出しの続きを書く入口', () => {
  it('completed のとき行を出し、押すと onWrite を呼ぶ', async () => {
    const onWrite = jest.fn();
    const fake = createFakeRepository([full]);
    await renderDetail(fake.repository, <RecordDetailScreen recordId="x" onWrite={onWrite} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '書き出しの続きを書く' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: '書き出しの続きを書く' }));
    expect(onWrite).toHaveBeenCalledWith('x');
  });

  it('completed 以外では出さない', async () => {
    await show({ ...full, status: 'in_progress' });
    expect(screen.queryByRole('button', { name: '書き出しの続きを書く' })).toBeNull();
  });
});

describe('RecordDetailScreen の操作', () => {
  it('「編集」で onEdit、戻るで onBack が呼ばれる', async () => {
    const onEdit = jest.fn();
    const onBack = jest.fn();
    const { repository } = createFakeRepository([full]);
    await renderDetail(repository, <RecordDetailScreen recordId="x" onEdit={onEdit} onBack={onBack} />);
    await waitFor(() => expect(screen.getByText('編集')).toBeTruthy());
    await fireEvent.press(screen.getByText('編集'));
    expect(onEdit).toHaveBeenCalledWith('x');
    await fireEvent.press(screen.getByRole('button', { name: '戻る' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('存在しない id では見つからない表示と戻るボタンを出す', async () => {
    const onBack = jest.fn();
    const { repository } = createFakeRepository([]);
    await renderDetail(repository, <RecordDetailScreen recordId="nope" onBack={onBack} />);
    await waitFor(() => expect(screen.getByText('記録が見つかりません')).toBeTruthy());
    await fireEvent.press(screen.getByText('一覧へ戻る'));
    expect(onBack).toHaveBeenCalled();
  });

  it('読み込み中は「読み込み中」を出す', async () => {
    const { repository } = createFakeRepository([full]);
    const slow: RecordRepository = {
      ...repository,
      getAll: () => new Promise(() => {}),
    };
    await renderDetail(slow, <RecordDetailScreen recordId="x" />);
    expect(screen.getByLabelText('読み込み中')).toBeTruthy();
  });

  it('読み出しが reject されても見つからない表示になる', async () => {
    const { repository } = createFakeRepository([full]);
    const failing: RecordRepository = {
      ...repository,
      getAll: async () => {
        throw new Error('fail');
      },
    };
    await renderDetail(failing, <RecordDetailScreen recordId="x" />);
    await waitFor(() => expect(screen.getByText('記録が見つかりません')).toBeTruthy());
  });
});

describe('削除の確認', () => {
  it('「この記録を削除」で確認シートが出る', async () => {
    await show();
    await fireEvent.press(screen.getByText('この記録を削除'));
    expect(await screen.findByText('この記録を削除しますか？')).toBeTruthy();
    expect(screen.getByText('「吾輩は猫である」の記録と、付けた写真が削除されます。元に戻せません。')).toBeTruthy();
  });

  it('キャンセルでは削除されない', async () => {
    const { repository, onDeleted } = await show();
    const del = jest.spyOn(repository, 'delete');
    await fireEvent.press(screen.getByText('この記録を削除'));
    await fireEvent.press(await screen.findByText('キャンセル'));
    await waitFor(() => expect(screen.queryByText('この記録を削除しますか？')).toBeNull());
    expect(del).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('シートの外タップはキャンセルと同じ', async () => {
    const { repository } = await show();
    const del = jest.spyOn(repository, 'delete');
    await fireEvent.press(screen.getByText('この記録を削除'));
    await screen.findByText('この記録を削除しますか？');
    await fireEvent.press(screen.getByTestId('bottom-sheet-scrim', { includeHiddenElements: true }));
    await waitFor(() => expect(screen.queryByText('この記録を削除しますか？')).toBeNull());
    expect(del).not.toHaveBeenCalled();
  });

  it('「削除する」で記録・写真を削除し、触覚 1 回、onDeleted', async () => {
    const photoService = createMockPhotoService();
    const { repository, onDeleted } = await show({ ...full, photoUri: PHOTO }, photoService);
    const del = jest.spyOn(repository, 'delete');
    await fireEvent.press(screen.getByText('この記録を削除'));
    await fireEvent.press(await screen.findByText('削除する'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith('x');
    expect(photoService.remove).toHaveBeenCalledWith(PHOTO);
    expect(triggerImpactHaptic).toHaveBeenCalledTimes(1);
  });

  it('写真がなければ photoService.remove を呼ばない', async () => {
    const photoService = createMockPhotoService();
    const { onDeleted } = await show(full, photoService);
    await fireEvent.press(screen.getByText('この記録を削除'));
    await fireEvent.press(await screen.findByText('削除する'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(photoService.remove).not.toHaveBeenCalled();
  });

  it('削除に失敗すると「削除できませんでした」を出し onDeleted を呼ばない', async () => {
    const onDeleted = jest.fn();
    const { repository } = createFakeRepository([full]);
    const failing: RecordRepository = {
      ...repository,
      delete: async () => {
        throw new Error('fail');
      },
    };
    await renderDetail(failing, <RecordDetailScreen recordId="x" onDeleted={onDeleted} />);
    await waitFor(() => expect(screen.getByText('この記録を削除')).toBeTruthy());
    await fireEvent.press(screen.getByText('この記録を削除'));
    await fireEvent.press(await screen.findByText('削除する'));
    await waitFor(() => expect(screen.getByText('削除できませんでした')).toBeTruthy());
    expect(onDeleted).not.toHaveBeenCalled();
    expect(triggerImpactHaptic).not.toHaveBeenCalled();
  });
});

describe('写真の変更', () => {
  const open = () => fireEvent.press(screen.getByRole('button', { name: '写真を変更' }));

  it('ライブラリで選ぶと photoUri を更新し、旧写真を削除する', async () => {
    const photoService = createMockPhotoService({
      pick: jest.fn().mockResolvedValue({ status: 'picked', uri: 'file:///tmp/new.jpg' }),
    });
    const { repository } = await show({ ...full, photoUri: PHOTO }, photoService);
    const update = jest.spyOn(repository, 'update');
    await open();
    await fireEvent.press(await screen.findByText('ライブラリから選択'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]?.[1].photoUri).toBe('file:///documents/photos/saved-new.jpg');
    await waitFor(() => expect(photoService.remove).toHaveBeenCalledWith(PHOTO));
    await waitFor(() => expect(screen.queryByText('写真を変更')).toBeNull());
  });

  it('カメラで撮影して写真がなかった記録に付ける（remove は呼ばない）', async () => {
    const photoService = createMockPhotoService({
      pick: jest.fn().mockResolvedValue({ status: 'picked', uri: 'file:///tmp/c.jpg' }),
    });
    const { repository } = await show(full, photoService);
    const update = jest.spyOn(repository, 'update');
    await open();
    await fireEvent.press(await screen.findByText('カメラで撮影'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(photoService.pick).toHaveBeenCalledWith('camera');
    expect(photoService.remove).not.toHaveBeenCalled();
  });

  it('キャンセルでは何も変わらない', async () => {
    const photoService = createMockPhotoService();
    const { repository } = await show(full, photoService);
    const update = jest.spyOn(repository, 'update');
    await open();
    await fireEvent.press(await screen.findByText('カメラで撮影'));
    await waitFor(() => expect(photoService.pick).toHaveBeenCalled());
    expect(update).not.toHaveBeenCalled();
  });

  it('権限拒否ではメッセージと「設定を開く」を出す', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const photoService = createMockPhotoService({
      pick: jest.fn().mockResolvedValue({ status: 'denied', canAskAgain: false }),
    });
    await show(full, photoService);
    await open();
    await fireEvent.press(await screen.findByText('カメラで撮影'));
    expect(await screen.findByText('カメラへのアクセスが許可されていません')).toBeTruthy();
    await fireEvent.press(screen.getByText('設定を開く'));
    expect(openSettings).toHaveBeenCalled();
  });

  it('「写真を削除」で photoUri が null になり旧写真を削除する', async () => {
    const photoService = createMockPhotoService();
    const { repository } = await show({ ...full, photoUri: PHOTO }, photoService);
    const update = jest.spyOn(repository, 'update');
    await open();
    await fireEvent.press(await screen.findByText('写真を削除'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]?.[1].photoUri).toBeNull();
    await waitFor(() => expect(photoService.remove).toHaveBeenCalledWith(PHOTO));
  });

  it('写真がなければ「写真を削除」は出ない', async () => {
    await show();
    await open();
    await screen.findByText('カメラで撮影');
    expect(screen.queryByText('写真を削除')).toBeNull();
  });

  it('更新に失敗したらメッセージを出す', async () => {
    const photoService = createMockPhotoService();
    const { repository } = createFakeRepository([{ ...full, photoUri: PHOTO }]);
    const failing: RecordRepository = {
      ...repository,
      update: async () => {
        throw new Error('fail');
      },
    };
    await renderDetail(failing, <RecordDetailScreen recordId="x" />, photoService);
    await waitFor(() => expect(screen.getAllByText('吾輩は猫である')).toBeTruthy());
    await open();
    await fireEvent.press(await screen.findByText('写真を削除'));
    expect(await screen.findByText('写真を保存できませんでした')).toBeTruthy();
    expect(photoService.remove).not.toHaveBeenCalled();
  });

  it('記録が消えていて更新が null を返したら失敗扱いにする', async () => {
    const photoService = createMockPhotoService({
      pick: jest.fn().mockResolvedValue({ status: 'picked', uri: 'file:///tmp/n.jpg' }),
    });
    const { repository } = createFakeRepository([full]);
    const gone: RecordRepository = { ...repository, update: async () => null };
    await renderDetail(gone, <RecordDetailScreen recordId="x" />, photoService);
    await waitFor(() => expect(screen.getAllByText('吾輩は猫である')).toBeTruthy());
    await open();
    await fireEvent.press(await screen.findByText('ライブラリから選択'));
    expect(await screen.findByText('写真を保存できませんでした')).toBeTruthy();
  });
});

describe('RecordDetailScreen の本棚', () => {
  async function showWithShelves(record = full, failUpdate = false) {
    const shelfRepository: ShelfRepository = createShelfRepository(createMemoryStorage().storage);
    await shelfRepository.importShelves(
      [
        { id: 'a', name: 'SF', order: 0 },
        { id: 'b', name: '哲学', order: 1 },
      ],
      'replace',
    );
    const fake = createFakeRepository([record]);
    if (failUpdate) fake.repository.update = () => Promise.reject(new Error('x'));
    await renderRouter({
      index: () =>
        withRepository(fake.repository, <RecordDetailScreen recordId="x" />, undefined, undefined, shelfRepository),
    });
    await waitFor(() => expect(screen.getAllByText(record.title, { exact: false })).toBeTruthy());
    return fake;
  }

  it('入れていなければ「まだ入れていません」、入っていれば名前を「、」でつなぐ', async () => {
    await showWithShelves();
    expect(await screen.findByRole('button', { name: '本棚、まだ入れていません' })).toBeTruthy();
  });

  it('入っている本棚の名前を出す', async () => {
    await showWithShelves({ ...full, shelfIds: ['b', 'a', 'gone'] });
    expect(await screen.findByRole('button', { name: '本棚、SF、哲学' })).toBeTruthy();
  });

  it('シートで選ぶと shelfIds だけが保存され、行の表示が変わる', async () => {
    const fake = await showWithShelves({ ...full, shelfIds: ['a'] });
    await fireEvent.press(await screen.findByRole('button', { name: '本棚、SF' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: '哲学' }));
    await fireEvent.press(screen.getByRole('button', { name: '2 つの本棚に入れる' }));
    expect(await screen.findByRole('button', { name: '本棚、SF、哲学' })).toBeTruthy();
    const saved = (await fake.repository.getAll())[0];
    expect(saved.shelfIds).toEqual(['a', 'b']);
    expect(saved).toMatchObject({ title: full.title, rating: full.rating, oneLiner: full.oneLiner });
  });

  it('シートの中で本棚を作ると、チェックが入った状態で一覧に増える', async () => {
    await showWithShelves();
    await fireEvent.press(await screen.findByRole('button', { name: '本棚、まだ入れていません' }));
    await fireEvent.press(await screen.findByRole('button', { name: '本棚を作る' }));
    await fireEvent.changeText(await screen.findByLabelText('名前'), '詩集');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '詩集' }).props.accessibilityState.checked).toBe(true));
    expect(screen.getByRole('button', { name: '1 つの本棚に入れる' })).toBeTruthy();
  });

  it('保存に失敗しても落ちず、シートにエラーを出す', async () => {
    await showWithShelves(full, true);
    await fireEvent.press(await screen.findByRole('button', { name: '本棚、まだ入れていません' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'SF' }));
    await fireEvent.press(screen.getByRole('button', { name: '1 つの本棚に入れる' }));
    expect(await screen.findByText('保存できませんでした')).toBeTruthy();
    expect(screen.getAllByText('吾輩は猫である').length).toBeGreaterThan(0);
  });
});


describe('書影の自動取得', () => {
  const target: MediaRecord = { ...full, coverUrl: null, photoUri: null };
  const FOUND = 'https://books.google.com/c.jpg';

  async function open(
    resolver: (isbn: string) => Promise<string | null>,
    record = target,
    wrap?: (r: RecordRepository) => RecordRepository,
  ) {
    const fake = createFakeRepository([record]);
    const repository = wrap ? wrap(fake.repository) : fake.repository;
    const update = jest.spyOn(repository, 'update');
    const view = await renderRouter({
      index: () => withRepository(repository, <RecordDetailScreen recordId="x" />, undefined, resolver),
    });
    await waitFor(() => expect(screen.getAllByText(record.title, { exact: false })).toBeTruthy());
    return { ...fake, repository, update, view };
  }

  it('見つかれば 1 回だけ取得して保存し、クレジットは出さない', async () => {
    const resolver = jest.fn(async (_isbn: string) => FOUND);
    const { update, repository } = await open(resolver);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/書影:/)).toBeNull();
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith('9784101010014');
    expect(update).toHaveBeenCalledTimes(1);
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({
      coverUrl: FOUND,
      title: target.title,
      oneLiner: target.oneLiner,
    });
  });

  it.each([
    'https://cover.openbd.jp/9784101010014.jpg',
    'https://ndlsearch.ndl.go.jp/thumbnail/9784101010014.jpg',
    'https://books.google.com/books/content?id=1',
  ])('coverUrl が %s でもクレジットを出さない', async (coverUrl) => {
    await open(async () => FOUND, { ...target, coverUrl });
    expect(screen.queryByText(/書影:/)).toBeNull();
  });

  it('見つからない・失敗したときは何も変えず、再試行もしない', async () => {
    const nothing = jest.fn(async (_isbn: string) => null);
    const first = await open(nothing);
    await waitFor(() => expect(nothing).toHaveBeenCalledTimes(1));
    expect(first.update).not.toHaveBeenCalled();
    expect(screen.queryByText(/書影:/)).toBeNull();

    const failing = jest.fn(async (_isbn: string): Promise<string | null> => {
      throw new Error('x');
    });
    const second = await open(failing);
    await waitFor(() => expect(failing).toHaveBeenCalledTimes(1));
    expect(second.update).not.toHaveBeenCalled();
  });

  it.each([
    ['書影がある', { coverUrl: 'https://cover.openbd.jp/c.jpg' }],
    ['写真がある', { photoUri: PHOTO }],
    ['ISBN がない', { isbn: null }],
  ])('%s ときは取得せず、クレジットを出さない', async (_name, override) => {
    const resolver = jest.fn(async (_isbn: string) => FOUND);
    await open(resolver, { ...target, ...override });
    expect(resolver).not.toHaveBeenCalled();
    expect(screen.queryByText(/書影:/)).toBeNull();
  });

  it('取得中に写真が付いたら上書きしない', async () => {
    let finish: (v: string | null) => void = () => undefined;
    const resolver = jest.fn(() => new Promise<string | null>((r) => (finish = r)));
    const { update, setRecords } = await open(resolver);
    await waitFor(() => expect(resolver).toHaveBeenCalled());
    setRecords([{ ...target, photoUri: PHOTO }]);
    await act(async () => finish(FOUND));
    expect(update).not.toHaveBeenCalled();
  });

  it('保存に失敗しても何も表示しない', async () => {
    const resolver = jest.fn(async (_isbn: string) => FOUND);
    await open(resolver, target, (r) => ({
      ...r,
      update: async () => {
        throw new Error('fail');
      },
    }));
    await waitFor(() => expect(resolver).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/書影:/)).toBeNull();
  });

  it('取得中にアンマウントしたら更新しない', async () => {
    let finish: (v: string | null) => void = () => undefined;
    const resolver = jest.fn(() => new Promise<string | null>((r) => (finish = r)));
    const { update, view } = await open(resolver);
    await waitFor(() => expect(resolver).toHaveBeenCalled());
    view.unmount();
    await act(async () => finish(FOUND));
    expect(update).not.toHaveBeenCalled();
  });
});
