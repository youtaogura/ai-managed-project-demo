import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { colors } from '../../design/tokens';
import { FileServiceContextProvider } from '../../hooks/useFileService';
import { BACKUP_FORMAT } from '../../lib/constants';
import { buildBackup } from '../../lib/backup';
import { createExportStore, LAST_EXPORTED_AT_KEY } from '../../lib/exportStore';
import type { FileService } from '../../lib/fileService/FileService';
import { formatDate } from '../../lib/format';
import { createRecordRepository, RECORDS_STORAGE_KEY } from '../../lib/recordRepository';
import { createSettingsStore, SETTINGS_STORAGE_KEY, type SettingsStore } from '../../lib/settingsStore';
import { createShelfRepository } from '../../lib/shelfRepository';
import { createStarterSettingsStore } from '../../lib/starterSettingsStore';
import { defaultStarterSettings } from '../../lib/starterDefaults';
import { withRepository, withSettings, withShelfRepository, withStarterSettings } from '../../testProviders';
import { createMemoryStorage, createMockPhotoService, makeRecord } from '../../testUtils';
import type { PhotoService } from '../../lib/photo/PhotoService';
import { triggerImpactHaptic } from '../../lib/haptics';
import { router } from 'expo-router';
import { DEFAULT_SETTINGS } from '../../types/settings';
import type { MediaRecord } from '../../types/record';
import { DataScreen } from '../DataScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../lib/haptics', () => ({ triggerImpactHaptic: jest.fn() }));
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    router: Object.assign(Object.create(actual.router), {
      dismissTo: jest.fn(),
    }),
  };
});

const records = [
  makeRecord({ id: 'a', title: 'アルファ' }),
  makeRecord({ id: 'b', title: 'ベータ', photoUri: 'file:///p.jpg' }),
];

function fakeFileService(overrides: Partial<FileService> = {}) {
  const service: FileService = {
    saveAndShare: jest.fn().mockResolvedValue('shared'),
    pickTextFile: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  return service;
}

async function setup(
  fileService: FileService,
  options: {
    initial?: MediaRecord[];
    photoService?: PhotoService;
    settingsStore?: SettingsStore;
    extra?: Record<string, string>;
  } = {},
) {
  const { initial = records, extra = {} } = options;
  const photoService = options.photoService ?? createMockPhotoService();
  const memory = createMemoryStorage({
    [RECORDS_STORAGE_KEY]: JSON.stringify(initial),
    ...extra,
  });
  const repository = createRecordRepository(memory.storage);
  const settingsStore = options.settingsStore ?? createSettingsStore(memory.storage);
  const exportStore = createExportStore(memory.storage);
  const shelfRepository = createShelfRepository(memory.storage);
  const starterSettingsStore = createStarterSettingsStore(memory.storage);
  await renderRouter({
    index: () =>
      withStarterSettings(
        starterSettingsStore,
        withShelfRepository(
          shelfRepository,
          withSettings(
            settingsStore,
            withRepository(
              repository,
              <FileServiceContextProvider service={fileService}>
                <DataScreen
                  exportStore={exportStore}
                  settingsStore={settingsStore}
                  starterSettingsStore={starterSettingsStore}
                />
              </FileServiceContextProvider>,
              photoService,
            ),
          ),
        ),
      ),
    other: () => <Text>other</Text>,
  });
  return {
    memory,
    repository,
    photoService,
    settingsStore,
    shelfRepository,
    starterSettingsStore,
  };
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const today = () => formatDate(new Date().toISOString());

describe('DataScreen', () => {
  it('件数・行・説明文を出す（未書き出し）', async () => {
    await setup(fakeFileService());
    expect(await screen.findByText('2')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: '記録を書き出す、まだ書き出していません',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /^記録を読み込む/ })).toBeTruthy();
    expect(
      screen.getByText('記録はこの端末の中にだけ保存されています。機種変更の前には書き出してください。'),
    ).toBeTruthy();
  });

  it('0 件は「0」を出す', async () => {
    await setup(fakeFileService(), { initial: [] });
    expect(await screen.findByText('0')).toBeTruthy();
  });

  it('最後に書き出した日を出す', async () => {
    await setup(fakeFileService(), {
      extra: {
        [LAST_EXPORTED_AT_KEY]: new Date(2026, 9, 26, 12).toISOString(),
      },
    });
    expect(
      await screen.findByRole('button', {
        name: '記録を書き出す、2026年10月26日',
      }),
    ).toBeTruthy();
  });

  it('JSON で書き出す: 内容・MIME・日付の更新・シートが閉じる', async () => {
    const service = fakeFileService();
    const { memory } = await setup(service);
    await screen.findByText('2');
    await press(/^記録を書き出す/);
    expect(screen.getByText('2 件の記録')).toBeTruthy();
    expect(screen.getByText(/自分で撮った写真は含まれません/)).toBeTruthy();
    await press('バックアップ（JSON）');
    await waitFor(() => expect(service.saveAndShare).toHaveBeenCalledTimes(1));
    const arg = jest.mocked(service.saveAndShare).mock.calls[0]?.[0];
    expect(arg?.mimeType).toBe('application/json');
    expect(arg?.filename).toMatch(/^records-backup-\d{8}\.json$/);
    const parsed = JSON.parse(arg?.content ?? '{}');
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.records.map((r: MediaRecord) => r.photoUri)).toEqual([null, null]);
    await waitFor(() => expect(screen.getByRole('button', { name: `記録を書き出す、${today()}` })).toBeTruthy());
    expect(memory.data.get(LAST_EXPORTED_AT_KEY)).toBeTruthy();
    expect(screen.queryByText('表形式（CSV）')).toBeNull();
  });

  it('CSV で書き出す', async () => {
    const service = fakeFileService();
    await setup(service);
    await screen.findByText('2');
    await press(/^記録を書き出す/);
    await press('表形式（CSV）');
    await waitFor(() => expect(service.saveAndShare).toHaveBeenCalledTimes(1));
    const arg = jest.mocked(service.saveAndShare).mock.calls[0]?.[0];
    expect(arg?.mimeType).toBe('text/csv');
    expect(arg?.filename).toMatch(/^records-\d{8}\.csv$/);
    expect(arg?.content.startsWith('﻿タイトル,')).toBe(true);
  });

  it('キャンセルでは日時を更新しない', async () => {
    const service = fakeFileService({
      saveAndShare: jest.fn().mockResolvedValue('cancelled'),
    });
    const { memory } = await setup(service);
    await screen.findByText('2');
    await press(/^記録を書き出す/);
    await press('バックアップ（JSON）');
    await waitFor(() => expect(service.saveAndShare).toHaveBeenCalled());
    expect(memory.data.has(LAST_EXPORTED_AT_KEY)).toBe(false);
  });

  it('書き出しの例外ではエラーを出し、日時を更新しない', async () => {
    const service = fakeFileService({
      saveAndShare: jest.fn().mockRejectedValue(new Error('x')),
    });
    const { memory } = await setup(service);
    await screen.findByText('2');
    await press(/^記録を書き出す/);
    await press('バックアップ（JSON）');
    expect(await screen.findByRole('alert')).toHaveTextContent('書き出せませんでした。もう一度お試しください');
    expect(memory.data.has(LAST_EXPORTED_AT_KEY)).toBe(false);
  });

  it('0 件のとき CSV は無効で、JSON は書き出せる', async () => {
    const service = fakeFileService();
    await setup(service, { initial: [] });
    await screen.findByText('0');
    await press(/^記録を書き出す/);
    const csv = screen.getByRole('button', { name: '表形式（CSV）' });
    expect(csv.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText('記録がありません')).toBeTruthy();
    await press('バックアップ（JSON）');
    await waitFor(() => expect(service.saveAndShare).toHaveBeenCalledTimes(1));
  });
});

function backupText(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    ...buildBackup(
      [makeRecord({ id: 'a', title: 'ファイルのアルファ' }), makeRecord({ id: 'c', title: 'ガンマ' })],
      [],
      defaultStarterSettings(),
      { heroCriterion: 'none', defaultStatus: 'completed' },
      '2026-10-26T03:00:00.000Z',
    ),
    ...overrides,
  });
}

const pick = (text: string, name = 'b.json') =>
  fakeFileService({
    pickTextFile: jest.fn().mockResolvedValue({ name, text }),
  });

describe('DataScreen（読み込み）', () => {
  it('キャンセルなら何も出ない', async () => {
    await setup(fakeFileService());
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.queryByText('記録を読み込む', { exact: true, hidden: false })).toBeTruthy();
  });

  it.each([
    ['{', 'このアプリのバックアップファイルではありません'],
    ['{"a":1}', 'このアプリのバックアップファイルではありません'],
    [backupText({ records: [{ id: 'x' }] }), 'ファイルが壊れているため読み込めません'],
    [backupText({ version: 3 }), '新しいバージョンのアプリで書き出されたファイルです。アプリを更新してください'],
  ])('不正なファイルは何も変えずにエラーを出す: %#', async (text, expected) => {
    const { repository } = await setup(pick(text));
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(await repository.getAll()).toHaveLength(2);
    expect(screen.queryByText('今の記録に追加する')).toBeNull();
  });

  it('ファイルを開けなければエラーを出す', async () => {
    await setup(
      fakeFileService({
        pickTextFile: jest.fn().mockRejectedValue(new Error('x')),
      }),
    );
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    expect(await screen.findByRole('alert')).toHaveTextContent('ファイルを開けませんでした');
  });

  it('確認シートにファイル名・件数・書き出した日・初期選択を出し、キャンセルで何も変わらない', async () => {
    const { repository } = await setup(pick(backupText(), 'my.json'));
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    expect(await screen.findByText('my.json')).toBeTruthy();
    expect(screen.getByText('2 件の記録')).toBeTruthy();
    expect(screen.getByText(/書き出した日 2026年10月26日/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: '今の記録に追加する' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByRole('radio', { name: '設定も読み込む' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    await press('キャンセル');
    await waitFor(() => expect(screen.queryByText('my.json')).toBeNull());
    expect(await repository.getAll()).toHaveLength(2);
  });

  it('追加で読み込み、件数・メッセージ・設定が更新される', async () => {
    const { repository, memory } = await setup(pick(backupText()));
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    await fireEvent.press(await screen.findByRole('radio', { name: '今の記録に追加する' }));
    await press('読み込む');
    expect(await screen.findByText('3 件の記録を読み込みました')).toBeTruthy();
    const all = await repository.getAll();
    expect(all.map((r) => r.title)).toEqual(['ファイルのアルファ', 'ベータ', 'ガンマ']);
    expect(all[1]?.photoUri).toBe('file:///p.jpg');
    expect(await screen.findByText('3')).toBeTruthy();
    expect(JSON.parse(memory.data.get(SETTINGS_STORAGE_KEY) ?? '{}')).toEqual({
      heroCriterion: 'none',
      defaultStatus: 'completed',
    });
  });

  it('置き換え・設定は読み込まない', async () => {
    const { repository, memory } = await setup(pick(backupText()));
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    await fireEvent.press(await screen.findByRole('radio', { name: '今の記録と置き換える' }));
    await fireEvent.press(screen.getByRole('radio', { name: '設定は読み込まない' }));
    await press('読み込む');
    expect(await screen.findByText('2 件の記録を読み込みました')).toBeTruthy();
    expect((await repository.getAll()).map((r) => r.id)).toEqual(['a', 'c']);
    expect(memory.data.has(SETTINGS_STORAGE_KEY)).toBe(false);
  });

  it('ファイルに設定がなければ設定の選択肢を出さない', async () => {
    await setup(pick(backupText({ settings: null })));
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    await screen.findByText('今の記録に追加する');
    expect(screen.queryByText('設定も読み込む')).toBeNull();
  });

  it('applyImport が失敗したらエラーを出し、記録は変わらない', async () => {
    const failing: SettingsStore = {
      load: async () => DEFAULT_SETTINGS,
      save: async () => {
        throw new Error('fail');
      },
    };
    const { repository } = await setup(pick(backupText()), {
      settingsStore: failing,
    });
    await screen.findByText('2');
    await press(/^記録を読み込む/);
    await fireEvent.press(await screen.findByRole('radio', { name: '今の記録と置き換える' }));
    await press('読み込む');
    expect(await screen.findByRole('alert')).toHaveTextContent('読み込めませんでした。記録は変わっていません');
    expect((await repository.getAll()).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('書き出し → 全削除 → 読み込みで記録が戻る', async () => {
    const service = fakeFileService();
    const { repository } = await setup(service);
    await screen.findByText('2');
    await press(/^記録を書き出す/);
    await press('バックアップ（JSON）');
    await waitFor(() => expect(service.saveAndShare).toHaveBeenCalled());
    const content = jest.mocked(service.saveAndShare).mock.calls[0]?.[0].content ?? '';
    await repository.importRecords([], 'replace');
    jest.mocked(service.pickTextFile).mockResolvedValue({ name: 'b.json', text: content });
    await waitFor(() => expect(screen.queryByText('バックアップ（JSON）')).toBeNull());
    await press(/^記録を読み込む/);
    await press('読み込む');
    expect(await screen.findByText('2 件の記録を読み込みました')).toBeTruthy();
    expect((await repository.getAll()).map((r) => r.title)).toEqual(['アルファ', 'ベータ']);
  });
});

describe('DataScreen（すべての記録を削除）', () => {
  const dismissTo = jest.mocked(router.dismissTo);

  beforeEach(() => {
    dismissTo.mockClear();
    jest.mocked(triggerImpactHaptic).mockClear();
  });

  const openSheet = async () => {
    await screen.findByText('2');
    await press('すべての記録を削除');
  };

  it('リンクは danger の文字・44px 以上で、0 件のときは出ない', async () => {
    await setup(fakeFileService());
    await screen.findByText('2');
    const link = screen.getByRole('button', { name: 'すべての記録を削除' });
    expect(link).toHaveStyle({ minHeight: 44 });
    expect(screen.getByText('すべての記録を削除')).toHaveStyle({
      color: colors.danger,
    });
  });

  it('0 件ではリンクを出さない', async () => {
    await setup(fakeFileService(), { initial: [] });
    await screen.findByText('0');
    expect(screen.queryByRole('button', { name: 'すべての記録を削除' })).toBeNull();
  });

  it('タップで確認シートが開き、全件数を出す', async () => {
    await setup(fakeFileService());
    await openSheet();
    expect(screen.getByText('すべての記録を削除しますか？')).toBeTruthy();
    expect(
      screen.getByText('2 件の記録と、付けた写真がすべて削除されます。元に戻せません。設定はそのまま残ります。'),
    ).toBeTruthy();
  });

  it('「すべて削除する」で記録と写真を消し、設定は残し、触覚 1 回・一覧へ戻る', async () => {
    const { memory, photoService, settingsStore } = await setup(fakeFileService());
    await settingsStore.save({
      ...DEFAULT_SETTINGS,
      heroCriterion: 'highRated',
    });
    const settingsBefore = memory.data.get(SETTINGS_STORAGE_KEY);
    await openSheet();
    await press('すべて削除する');
    await waitFor(() => expect(dismissTo).toHaveBeenCalledWith('/'));
    expect(memory.data.get(RECORDS_STORAGE_KEY)).toBe('[]');
    expect(photoService.remove).toHaveBeenCalledTimes(1);
    expect(photoService.remove).toHaveBeenCalledWith('file:///p.jpg');
    expect(memory.data.get(SETTINGS_STORAGE_KEY)).toBe(settingsBefore);
    expect(triggerImpactHaptic).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('0')).toBeTruthy();
  });

  it('「キャンセル」では何も消えず、触覚もない', async () => {
    const { memory, photoService } = await setup(fakeFileService());
    await openSheet();
    await press('キャンセル');
    expect(screen.queryByText('すべての記録を削除しますか？')).toBeNull();
    expect(JSON.parse(memory.data.get(RECORDS_STORAGE_KEY) ?? '[]')).toHaveLength(2);
    expect(photoService.remove).not.toHaveBeenCalled();
    expect(triggerImpactHaptic).not.toHaveBeenCalled();
    expect(dismissTo).not.toHaveBeenCalled();
  });

  it('「先に書き出す」で確認シートが閉じ、書き出しシートが開く。何も消えない', async () => {
    const { memory } = await setup(fakeFileService());
    await openSheet();
    await press('先に書き出す');
    expect(screen.queryByText('すべての記録を削除しますか？')).toBeNull();
    expect(screen.getByRole('button', { name: 'バックアップ（JSON）' })).toBeTruthy();
    expect(JSON.parse(memory.data.get(RECORDS_STORAGE_KEY) ?? '[]')).toHaveLength(2);
  });

  it('削除中は二重に実行されない', async () => {
    let release: () => void = () => undefined;
    const photoService = createMockPhotoService({
      remove: jest.fn(() => new Promise<void>((resolve) => (release = resolve))),
    });
    await setup(fakeFileService(), { photoService });
    await openSheet();
    await press('すべて削除する');
    await waitFor(() => expect(photoService.remove).toHaveBeenCalledTimes(1));
    await press('すべて削除する');
    release();
    await waitFor(() => expect(dismissTo).toHaveBeenCalledTimes(1));
    expect(photoService.remove).toHaveBeenCalledTimes(1);
    expect(triggerImpactHaptic).toHaveBeenCalledTimes(1);
  });

  it('削除に失敗したらシートを閉じてエラーを出し、遷移も触覚もしない', async () => {
    const { repository, memory } = await setup(fakeFileService());
    jest.spyOn(repository, 'deleteAll').mockRejectedValue(new Error('x'));
    await openSheet();
    await press('すべて削除する');
    expect(await screen.findByText('削除できませんでした。記録は変わっていません')).toBeTruthy();
    expect(screen.queryByText('すべての記録を削除しますか？')).toBeNull();
    expect(JSON.parse(memory.data.get(RECORDS_STORAGE_KEY) ?? '[]')).toHaveLength(2);
    expect(dismissTo).not.toHaveBeenCalled();
    expect(triggerImpactHaptic).not.toHaveBeenCalled();
  });
});
