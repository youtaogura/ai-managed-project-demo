import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { withRepository, withSettings } from '../../testProviders';
import { createShelfRepository } from '../../lib/shelfRepository';
import { colors } from '../../design/tokens';
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
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: jest.fn(() => true) },
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
  title: '既存',
  creator: '作者',
  publisher: null,
  isbn: null,
  coverUrl: 'http://cover',
  photoUri: 'file://photo',
  startDate: null,
  endDate: null,
  status: 'planned' as const,
  rating: null,
  source: { provider: 'manual' as const },
  oneLiner: null,
  starters: [],
  quotes: [],
  memos: [],
  freeTexts: [],
  favorite: false,
  shelfIds: [],
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

// 初回レンダリングが CI の遅い環境で 5 秒を超えることがあるため延長する
jest.setTimeout(30000);

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('RecordFormScreen（上のバー）', () => {
  beforeEach(() => jest.clearAllMocks());

  it('新規は「本を登録」を見出しにする', async () => {
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen />));
    expect(await screen.findByText('本を登録')).toBeTruthy();
  });

  it('「キャンセル」で前の画面に戻る。戻れないときは本棚へ', async () => {
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen />));
    await screen.findByText('本を登録');
    await press('キャンセル');
    expect(router.back).toHaveBeenCalledTimes(1);
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await press('キャンセル');
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('RecordFormScreen（新規）', () => {
  it('保存で add が呼ばれ、保存した記録の詳細へ移る', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(withRepository(repository, <RecordFormScreen />));
    await fireEvent.changeText(screen.getByLabelText('タイトル（必須）'), '新しい本');
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [created] = await repository.getAll();
    expect(router.replace).toHaveBeenCalledWith('/records/' + created?.id);
    expect(router.back).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ title: '新しい本', status: 'completed' }));
    expect(await repository.getAll()).toHaveLength(1);
  });

  it('タイトルが空なら add は呼ばれない', async () => {
    const repository = memoryRepository();
    const add = jest.spyOn(repository, 'add');
    await render(withRepository(repository, <RecordFormScreen />));
    await press('棚に並べる');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(add).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('初期値が入力済みになり、書影 URL が保存される', async () => {
    const repository = memoryRepository();
    await render(
      withRepository(repository, <RecordFormScreen initialValues={{ title: '検索結果', coverUrl: 'http://c' }} />),
    );
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('検索結果');
    await press('棚に並べる');
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
          initialValues={{
            title: 'N',
            source: { provider: 'ndl', ndlId: '5' },
          }}
        />,
      ),
    );
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ source: { provider: 'ndl', ndlId: '5' } }));
  });

  it('手入力は manual で保存される', async () => {
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'M' }} />));
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.source).toEqual({
      provider: 'manual',
    });
  });

  it('add が失敗したら画面に留まり失敗メッセージを表示する', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'add').mockRejectedValue(new Error('x'));
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'a' }} />));
    await press('棚に並べる');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RecordFormScreen（背表紙の色と本棚）', () => {
  const face = () => (StyleSheet.flatten(screen.getByRole('image').props.style as never) as { backgroundColor: string });

  it('新規の初期色は既存の記録数 n に対する spineColorForIndex(n)、選ばずに保存するとその色', async () => {
    const repository = memoryRepository();
    await repository.add(baseInput);
    await repository.add(baseInput);
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'N' }} />));
    expect(await screen.findByRole('radio', { name: '背表紙の色 3' })).toBeSelected();
    expect(face().backgroundColor).toBe(colors.spine3);
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[2]?.spineColor).toBe('spine-3');
  });

  it('記録の読み込みに失敗したら記録数 0 とみなして spine-1', async () => {
    const repository = memoryRepository();
    jest.spyOn(repository, 'getAll').mockRejectedValue(new Error('x'));
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'N' }} />));
    expect(await screen.findByRole('radio', { name: '背表紙の色 1' })).toBeSelected();
  });

  it('色を選んで保存すると記録の spineColor に入る。編集は元の色で開き、選ぶと変わる', async () => {
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'N' }} />));
    await fireEvent.press(await screen.findByRole('radio', { name: '背表紙の色 8' }));
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [saved] = await repository.getAll();
    expect(saved?.spineColor).toBe('spine-8');
    await cleanup();
    await render(withRepository(repository, <RecordFormScreen recordId={saved?.id} />));
    expect(await screen.findByRole('radio', { name: '背表紙の色 8' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: '背表紙の色 2' }));
    await press('保存する');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.spineColor).toBe('spine-2');
  });

  it('本棚をチップで選んで保存でき、編集では選択済みで開く', async () => {
    const memory = createMemoryStorage();
    const shelfRepository = createShelfRepository(memory.storage);
    const shelf = await shelfRepository.create('小説');
    const repository = memoryRepository();
    await render(withRepository(repository, <RecordFormScreen initialValues={{ title: 'N' }} />, shelfRepository));
    await fireEvent.press(await screen.findByRole('checkbox', { name: '小説' }));
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [saved] = await repository.getAll();
    expect(saved?.shelfIds).toEqual([shelf.id]);
    await cleanup();
    await render(withRepository(repository, <RecordFormScreen recordId={saved?.id} />, shelfRepository));
    expect(await screen.findByRole('checkbox', { name: '小説' })).toBeChecked();
  });

  it('本棚の読み込みに失敗したら本棚なしで開く', async () => {
    const shelfRepository = createShelfRepository(createMemoryStorage().storage);
    jest.spyOn(shelfRepository, 'getAll').mockRejectedValue(new Error('x'));
    await render(withRepository(memoryRepository(), <RecordFormScreen initialValues={{ title: 'N' }} />, shelfRepository));
    expect(await screen.findByRole('button', { name: '本棚を作る' })).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
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
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/records/' + record.id));
    expect(router.back).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(record.id, expect.objectContaining({ title: '変更後' }));
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({
      coverUrl: 'http://cover',
      photoUri: 'file://photo',
    });
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
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('読み終わった本を「読んでる」にして保存すると本棚へ戻して読んでる画面を開き直す', async () => {
    const repository = memoryRepository();
    const record = await repository.add({ ...baseInput, status: 'completed' });
    await render(withRepository(repository, <RecordFormScreen recordId={record.id} />));
    await fireEvent.press(await screen.findByRole('radio', { name: '読んでる' }));
    await press('保存する');
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading/' + record.id));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('読んでる本を何も変えずに保存すると読んでる画面へ dismissTo する', async () => {
    const repository = memoryRepository();
    const record = await repository.add({ ...baseInput, status: 'in_progress' });
    await render(withRepository(repository, <RecordFormScreen recordId={record.id} />));
    await screen.findByDisplayValue('既存');
    await press('保存する');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/reading/' + record.id));
    expect(router.back).not.toHaveBeenCalled();
  });

  it('読み終わった本を保存すると詳細へ dismissTo する', async () => {
    const repository = memoryRepository();
    const record = await repository.add({ ...baseInput, status: 'completed' });
    await render(withRepository(repository, <RecordFormScreen recordId={record.id} />));
    await screen.findByDisplayValue('既存');
    await press('保存する');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/records/' + record.id));
  });

  it('削除を確定すると delete が呼ばれ本棚へ戻る動きで移る', async () => {
    const { repository, record } = await setup();
    await screen.findByDisplayValue('既存');
    const del = jest.spyOn(repository, 'delete');
    await press('この本を削除');
    expect(screen.getByText('この記録を削除しますか？')).toBeTruthy();
    await press('削除する');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    expect(del).toHaveBeenCalledWith(record.id);
    expect(await repository.getAll()).toHaveLength(0);
  });

  it('キャンセルでは delete は呼ばれず画面に留まる', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    const del = jest.spyOn(repository, 'delete');
    await press('この本を削除');
    // 上のバーにも「キャンセル」があるので、削除の確認のシートの方（後ろ）を押す
    const cancels = screen.getAllByRole('button', { name: 'キャンセル' });
    await fireEvent.press(cancels[cancels.length - 1]);
    expect(del).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('delete が失敗したら失敗メッセージを表示する', async () => {
    const { repository } = await setup();
    await screen.findByDisplayValue('既存');
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('x'));
    await press('この本を削除');
    await press('削除する');
    expect(await screen.findByText('削除に失敗しました')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RecordFormScreen（書影を取りに行かない）', () => {
  it('ISBN があっても書影は取得せず、coverUrl: null のまま保存できる', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const repository = memoryRepository();
    await render(
      withRepository(repository, <RecordFormScreen initialValues={{ title: 'a', isbn: '9784065199817' }} />),
    );
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect((await repository.getAll())[0]?.coverUrl).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('RecordFormScreen（古い tmdb の候補）', () => {
  it('tmdb の source を持つクエリは manual として扱い、種別なしで保存する', async () => {
    const repository = memoryRepository();
    await render(
      withRepository(
        repository,
        <RecordFormScreen
          initialValues={paramsToInitialValues({
            kind: 'anime',
            title: '作品',
            sourceProvider: 'tmdb',
            sourceType: 'tv',
            sourceId: '42',
          })}
        />,
      ),
    );
    expect(screen.queryByText('種別')).toBeNull();
    await press('棚に並べる');
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [saved] = await repository.getAll();
    expect(saved).toMatchObject({
      title: '作品',
      source: { provider: 'manual' },
    });
    expect(saved).not.toHaveProperty('kind');
  });
});

describe('RecordFormScreen（ステータスの初期値）', () => {
  const withDefault = (status: RecordStatus, children: ReactNode) =>
    withSettings(
      createSettingsStore(
        createMemoryStorage({
          [SETTINGS_STORAGE_KEY]: JSON.stringify({ defaultStatus: status }),
        }).storage,
      ),
      children,
    );

  const saveNew = async (status: RecordStatus, initialValues: Partial<NewRecordInput>) => {
    const repository = memoryRepository();
    await render(
      withDefault(
        status,
        withRepository(repository, <RecordFormScreen initialValues={{ title: 'T', ...initialValues }} />),
      ),
    );
    await screen.findByLabelText('タイトル（必須）');
    await press('棚に並べる');
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
    expect(await saveNew(status, {})).toMatchObject({
      status,
      startDate: null,
      endDate: null,
    });
  });

  it('読書の言い方で選ばれる', async () => {
    const repository = memoryRepository();
    await render(withDefault('in_progress', withRepository(repository, <RecordFormScreen />)));
    const status = await screen.findByRole('radio', { name: '読んでる' });
    expect(status.props.accessibilityState).toMatchObject({ checked: true });
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
    await render(withDefault('completed', withRepository(repository, <RecordFormScreen recordId={record.id} />)));
    await screen.findByLabelText('タイトル（必須）');
    await press('保存する');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalled());
    expect((await repository.getAll())[0]).toMatchObject({
      status: 'planned',
      startDate: null,
      endDate: null,
    });
  });
});
