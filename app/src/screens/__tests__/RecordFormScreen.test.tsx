import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { withRepository, withSettings } from '../../testProviders';
import { paramsToInitialValues, todayString } from '../../lib/recordForm';
import { createRecordRepository } from '../../lib/recordRepository';
import type { KeyValueStorage } from '../../lib/storage';
import { createSettingsStore, SETTINGS_STORAGE_KEY } from '../../lib/settingsStore';
import { createMemoryStorage } from '../../testUtils';
import type { ReactNode } from 'react';
import type { NewRecordInput, RecordStatus } from '../../types/record';
import { RecordFormScreen } from '../RecordFormScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

function memoryRepository() {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return createRecordRepository(storage);
}

const baseInput = {
  kind: 'book' as const,
  title: '既存',
  creator: '作者',
  publisher: null,
  isbn: null,
  coverUrl: 'http://cover',
  photoUri: 'file://photo',
  startDate: null,
  endDate: null,
  status: 'planned' as const,
  review: null,
  rating: null,
  source: { provider: 'manual' as const },
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// 初回レンダリングが CI の遅い環境で 5 秒を超えることがあるため延長する
jest.setTimeout(30000);

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('RecordFormScreen（新規）', () => {
  it('保存で add が呼ばれ、保存した記録の詳細へ移る', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(withRepository(repository, <RecordFormScreen />));
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '新しい本');
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [created] = await repository.getAll();
    expect(router.replace).toHaveBeenCalledWith('/records/' + created?.id);
    expect(router.back).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新しい本', status: 'completed' }),
    );
    expect(await repository.getAll()).toHaveLength(1);
  });

  it('タイトルが空なら add は呼ばれない', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(withRepository(repository, <RecordFormScreen />));
    await press('記録する');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(add).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('初期値が入力済みになり、書影 URL が保存される', async () => {
    const repository = memoryRepository();
    await render(
      withRepository(
        repository,
        <RecordFormScreen initialValues={{ title: '検索結果', coverUrl: 'http://c' }} />,
      ),
    );
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('検索結果');
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.coverUrl).toBe('http://c');
  });

  it('初期値の source が保存され、手入力は manual で保存される', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(
      withRepository(
        repository,
        <RecordFormScreen
          initialValues={{ title: 'N', source: { provider: 'ndl', ndlId: '5' } }}
        />,
      ),
    );
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ source: { provider: 'ndl', ndlId: '5' } }),
    );
  });

  it('手入力は manual で保存される', async () => {
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'M' }} />));
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.source).toEqual({ provider: 'manual' });
  });

  it('add が失敗したら画面に留まり失敗メッセージを表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'add').mockRejectedValue(new Error('x'));
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'a' }} />));
    await press('記録する');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RecordFormScreen（編集）', () => {
  const setup = async () => {
    const repository = memoryRepository();
    const record = await repository.add(baseInput);
    await render(withRepository(repository, <RecordFormScreen recordId={record.id} />));
    return { repository, record };
  };

  it('既存値が入力済みで開き、保存で update が呼ばれ coverUrl / photoUri が維持される', async () => {
    const { repository, record } = await setup();
    expect(await screen.findByDisplayValue('既存')).toBeTruthy();
    const update = jest.spyOn(repository, 'update');
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '変更後');
    await press('保存する');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(record.id, expect.objectContaining({ title: '変更後' }));
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({ coverUrl: 'http://cover', photoUri: 'file://photo' });
  });

  it('存在しない id では「記録が見つかりません」を表示する', async () => {
    await render(withRepository(memoryRepository(), <RecordFormScreen recordId="none" />));
    expect(await screen.findByText('記録が見つかりません')).toBeTruthy();
  });

  it('読み込みに失敗しても「記録が見つかりません」を表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'getAll').mockRejectedValue(new Error('x'));
    await render(withRepository(repository, <RecordFormScreen recordId="1" />));
    expect(await screen.findByText('記録が見つかりません')).toBeTruthy();
  });

  it('保存時に記録が消えていたら失敗メッセージを表示する', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    await repository.delete(record.id);
    await press('保存する');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('削除を確定すると delete が呼ばれ一覧へ移る', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    const del = jest.spyOn(repository, 'delete');
    await press('この記録を削除');
    expect(screen.getByText('この記録を削除しますか？')).toBeTruthy();
    await press('削除する');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(del).toHaveBeenCalledWith(record.id);
    expect(await repository.getAll()).toHaveLength(0);
  });

  it('キャンセルでは delete は呼ばれず画面に留まる', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    const del = jest.spyOn(repository, 'delete');
    await press('この記録を削除');
    await press('キャンセル');
    expect(del).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('delete が失敗したら失敗メッセージを表示する', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('x'));
    await press('この記録を削除');
    await press('削除する');
    expect(await screen.findByText('削除に失敗しました')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RecordFormScreen の書影取得', () => {
  const ISBN = '9784065199817';
  const resolverFor = (value: string | null | Error) =>
    jest.fn(async (_isbn: string) => {
      if (value instanceof Error) throw value;
      return value;
    });
  const renderNew = async (
    resolver: ReturnType<typeof resolverFor>,
    initialValues: React.ComponentProps<typeof RecordFormScreen>['initialValues'],
  ) => {
    const repository = memoryRepository();
    await render(
      withRepository(
        repository,
        <RecordFormScreen initialValues={initialValues} />,
        undefined,
        resolver,
      ),
    );
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    return repository;
  };

  it('本で ISBN があり書影も写真もなければ、取得して coverUrl に保存する', async () => {
    const resolver = resolverFor('https://cover/x.jpg');
    const repository = await renderNew(resolver, { title: 'a', isbn: ISBN });
    expect(resolver).toHaveBeenCalledWith(ISBN);
    expect((await repository.getAll())[0]?.coverUrl).toBe('https://cover/x.jpg');
  });

  it('フォームで ISBN を手入力しても書影が付く', async () => {
    const resolver = resolverFor('https://cover/y.jpg');
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen />, undefined, resolver));
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), 'a');
    await fireEvent.changeText(screen.getByLabelText('ISBN'), ISBN);
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.coverUrl).toBe('https://cover/y.jpg');
  });

  it.each([
    ['書影 URL がある', { title: 'a', isbn: ISBN, coverUrl: 'https://own' }],
    ['写真がある', { title: 'a', isbn: ISBN, photoUri: 'file://p' }],
    ['映画で ISBN が保存されない', { title: 'a', kind: 'movie' as const, isbn: ISBN }],
    ['ISBN がない', { title: 'a' }],
  ])('%s ときは取得しない', async (_name, initial) => {
    const resolver = resolverFor('https://cover/x.jpg');
    await renderNew(resolver, initial);
    expect(resolver).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['例外', new Error('x')],
  ])('取得が %s でも coverUrl: null のまま保存できる', async (_name, value) => {
    const repository = await renderNew(resolverFor(value), { title: 'a', isbn: ISBN });
    expect((await repository.getAll())[0]?.coverUrl).toBeNull();
    expect(screen.queryByText('保存に失敗しました')).toBeNull();
  });

  it('編集でも、書影も写真もない本は保存時に取得する', async () => {
    const repository = memoryRepository();
    const record = await repository.add({
      ...baseInput,
      isbn: ISBN,
      coverUrl: null,
      photoUri: null,
    });
    const resolver = resolverFor('https://cover/z.jpg');
    await render(
      withRepository(repository, <RecordFormScreen recordId={record.id} />, undefined, resolver),
    );
    await screen.findByLabelText('タイトル（必須）');
    await press('保存する');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.coverUrl).toBe('https://cover/z.jpg');
  });
});

describe('RecordFormScreen（TMDb の候補）', () => {
  const params = {
    kind: 'anime',
    title: '作品',
    creator: '監督A',
    coverUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
    sourceProvider: 'tmdb',
    sourceType: 'tv',
    sourceId: '42',
  };

  it('そのまま保存すると tmdb の source・ポスター・種別が入り、ISBN・出版社は null', async () => {
    const repository = memoryRepository();
    await render(
      withRepository(
        repository,
        <RecordFormScreen initialValues={paramsToInitialValues(params)} />,
      ),
    );
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]).toMatchObject({
      kind: 'anime',
      title: '作品',
      creator: '監督A',
      coverUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
      isbn: null,
      publisher: null,
      source: { provider: 'tmdb', mediaType: 'tv', tmdbId: '42' },
    });
  });

  it('保存した記録を編集して保存しても source は保持される', async () => {
    const repository = memoryRepository();
    const record = await repository.add({
      ...baseInput,
      kind: 'movie',
      title: '映画',
      source: { provider: 'tmdb', mediaType: 'movie', tmdbId: '603' },
    });
    await render(withRepository(repository, <RecordFormScreen recordId={record.id} />));
    await screen.findByDisplayValue('映画');
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '映画（改）');
    await press('保存する');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect((await repository.getAll())[0]).toMatchObject({
      title: '映画（改）',
      source: { provider: 'tmdb', mediaType: 'movie', tmdbId: '603' },
    });
  });
});

describe('RecordFormScreen（使う種別）', () => {
  it('初期の種別が使わない種別なら、同じ系統の使う種別に置き換わる', async () => {
    const repository = memoryRepository();
    await render(
      withSettings(
        ['manga', 'movie', 'anime'],
        withRepository(repository, <RecordFormScreen initialValues={{ title: 'T' }} />),
      ),
    );
    expect(await screen.findByRole('radio', { name: '漫画' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '漫画' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.kind).toBe('manga');
  });

  it('使う種別が 1 つなら、渡された種別に関わらずその種別で保存される', async () => {
    const repository = memoryRepository();
    await render(
      withSettings(
        ['drama'],
        withRepository(
          repository,
          <RecordFormScreen initialValues={{ title: 'T', kind: 'book' }} />,
        ),
      ),
    );
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByText('種別')).toBeNull();
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.kind).toBe('drama');
  });

  it('使わない種別の記録も、編集して保存できる（元の種別を保つ）', async () => {
    const repository = memoryRepository();
    const record = await repository.add({ ...baseInput, kind: 'book' });
    await render(
      withSettings(
        ['movie'],
        withRepository(repository, <RecordFormScreen recordId={record.id} />),
      ),
    );
    expect(await screen.findByRole('radio', { name: '本' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '変更後');
    await press('保存する');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({ title: '変更後', kind: 'book' });
  });
});

describe('RecordFormScreen（ステータスの初期値）', () => {
  const withDefault = (status: RecordStatus, children: ReactNode) =>
    withSettings(
      createSettingsStore(
        createMemoryStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify({ defaultStatus: status }) })
          .storage,
      ),
      children,
    );

  const saveNew = async (status: RecordStatus, initialValues: Partial<NewRecordInput>) => {
    const repository = memoryRepository();
    await render(
      withDefault(
        status,
        withRepository(
          repository,
          <RecordFormScreen initialValues={{ title: 'T', ...initialValues }} />,
        ),
      ),
    );
    await screen.findByLabelText('タイトル（必須）');
    await press('記録する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    return (await repository.getAll())[0];
  };

  it('completed（初期）は終えた日に今日', async () => {
    expect(await saveNew('completed', {})).toMatchObject({
      status: 'completed',
      startDate: null,
      endDate: todayString(),
    });
  });

  it('in_progress は始めた日に今日', async () => {
    expect(await saveNew('in_progress', {})).toMatchObject({
      status: 'in_progress',
      startDate: todayString(),
      endDate: null,
    });
  });

  it.each(['planned', 'dropped'] as const)('%s は日付が空', async (status) => {
    expect(await saveNew(status, {})).toMatchObject({ status, startDate: null, endDate: null });
  });

  it('種別に合わせた言い方で選ばれ、種別を切り替えても保たれる', async () => {
    const repository = memoryRepository();
    await render(
      withDefault(
        'in_progress',
        withRepository(repository, <RecordFormScreen initialValues={{ kind: 'movie' }} />),
      ),
    );
    const status = await screen.findByRole('radio', { name: '見てる' });
    expect(status.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole('radio', { name: '本' }));
    expect(screen.getByRole('radio', { name: '読んでる' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('initialValues が status・日付を明示していればそれを優先する', async () => {
    expect(await saveNew('completed', { status: 'planned', endDate: '2020-01-01' })).toMatchObject({
      status: 'planned',
      endDate: '2020-01-01',
    });
  });

  it('編集では設定にかかわらず記録のステータス・日付が変わらない', async () => {
    const repository = memoryRepository();
    const record = await repository.add({ ...baseInput, status: 'planned' });
    await render(
      withDefault(
        'completed',
        withRepository(repository, <RecordFormScreen recordId={record.id} />),
      ),
    );
    await screen.findByLabelText('タイトル（必須）');
    await press('保存する');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect((await repository.getAll())[0]).toMatchObject({
      status: 'planned',
      startDate: null,
      endDate: null,
    });
  });
});
