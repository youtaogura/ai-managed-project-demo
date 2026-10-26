import { createFakeRepository, createMemoryStorage, makeRecord } from '../../testUtils';
import type { BackupFile } from '../../types/backup';
import type { Shelf } from '../../types/shelf';
import { applyImport } from '../importBackup';
import type { SettingsStore } from '../settingsStore';
import { createShelfRepository } from '../shelfRepository';
import { defaultStarterSettings } from '../starterDefaults';
import type { StarterSettingsStore } from '../starterSettingsStore';

const newSettings = {
  defaultStatus: 'planned' as const,
};
const newStarter = { ...defaultStarterSettings(), count: 5 as const };
const fileShelves: Shelf[] = [
  { id: 'same', name: 'ファイルの名前', order: 0 },
  { id: 'file-only', name: 'ファイルだけ', order: 1 },
];
const backup: BackupFile = {
  format: 'ai-managed-records-backup',
  version: 2,
  exportedAt: '2026-10-26T00:00:00.000Z',
  records: [makeRecord({ id: 'new' })],
  shelves: fileShelves,
  starterSettings: newStarter,
  settings: newSettings,
};

async function setup(saveImpl: SettingsStore['save'] = async () => undefined) {
  const { repository } = createFakeRepository([makeRecord({ id: 'old' })]);
  const shelfRepository = createShelfRepository(createMemoryStorage().storage, {
    generateId: jest.fn().mockReturnValueOnce('same').mockReturnValueOnce('local-only'),
  });
  await shelfRepository.create('今の名前');
  await shelfRepository.create('今だけ');
  const save = jest.fn(saveImpl);
  const settingsStore: SettingsStore = {
    load: async () => defaultSettingsLike,
    save,
  };
  const starterSave = jest.fn(async () => undefined);
  const starterSettingsStore: StarterSettingsStore = {
    load: async () => defaultStarterSettings(),
    save: starterSave,
  };
  return {
    repository,
    shelfRepository,
    settingsStore,
    starterSettingsStore,
    save,
    starterSave,
  };
}

const defaultSettingsLike = {
  defaultStatus: 'completed' as const,
};

describe('applyImport', () => {
  it('replace: 記録と本棚を置き換え、設定も保存して件数を返す', async () => {
    const s = await setup();
    const count = await applyImport({
      ...s,
      backup,
      mode: 'replace',
      includeSettings: true,
    });
    expect(count).toBe(1);
    expect((await s.repository.getAll()).map((r) => r.id)).toEqual(['new']);
    expect(await s.shelfRepository.getAll()).toEqual(fileShelves);
    expect(s.save).toHaveBeenCalledWith(newSettings);
    expect(s.starterSave).toHaveBeenCalledWith(newStarter);
  });

  it('merge: 本棚は同じ ID はファイルの内容、ほかは両方残る', async () => {
    const s = await setup();
    await applyImport({ ...s, backup, mode: 'merge', includeSettings: false });
    expect(await s.repository.getAll()).toHaveLength(2);
    expect(await s.shelfRepository.getAll()).toEqual([
      { id: 'same', name: 'ファイルの名前', order: 0 },
      { id: 'local-only', name: '今だけ', order: 1 },
      { id: 'file-only', name: 'ファイルだけ', order: 2 },
    ]);
  });

  it('includeSettings が false なら設定は変えない', async () => {
    const s = await setup();
    await applyImport({ ...s, backup, mode: 'merge', includeSettings: false });
    expect(s.save).not.toHaveBeenCalled();
    expect(s.starterSave).not.toHaveBeenCalled();
  });

  it('ファイルに設定がなければ保存しない', async () => {
    const s = await setup();
    await applyImport({
      ...s,
      backup: { ...backup, settings: null, starterSettings: null },
      mode: 'merge',
      includeSettings: true,
    });
    expect(s.save).not.toHaveBeenCalled();
    expect(s.starterSave).not.toHaveBeenCalled();
  });

  it('設定の保存に失敗したら記録・本棚・設定を元に戻して reject する', async () => {
    const s = await setup(async () => {
      throw new Error('fail');
    });
    await expect(applyImport({ ...s, backup, mode: 'replace', includeSettings: true })).rejects.toThrow('fail');
    expect((await s.repository.getAll()).map((r) => r.id)).toEqual(['old']);
    expect((await s.shelfRepository.getAll()).map((x) => x.id)).toEqual(['same', 'local-only']);
    expect(s.starterSave).toHaveBeenLastCalledWith(defaultStarterSettings());
  });
});
