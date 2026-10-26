import { createFakeRepository, makeRecord } from '../../testUtils';
import type { BackupFile } from '../../types/backup';
import type { SettingsStore } from '../settingsStore';
import { applyImport } from '../importBackup';

const newSettings = { heroCriterion: 'none' as const, defaultStatus: 'completed' as const };
const backup: BackupFile = {
  format: 'ai-managed-records-backup',
  version: 1,
  exportedAt: '2026-10-26T00:00:00.000Z',
  records: [makeRecord({ id: 'new' })],
  settings: newSettings,
};

function setup(saveImpl: SettingsStore['save'] = async () => undefined) {
  const { repository } = createFakeRepository([makeRecord({ id: 'old' })]);
  const save = jest.fn(saveImpl);
  const settingsStore: SettingsStore = { load: async () => newSettings, save };
  return { repository, settingsStore, save };
}

describe('applyImport', () => {
  it('記録を読み込み、設定も保存して件数を返す', async () => {
    const { repository, settingsStore, save } = setup();
    const count = await applyImport({ repository, settingsStore, backup, mode: 'replace', includeSettings: true });
    expect(count).toBe(1);
    expect((await repository.getAll()).map((r) => r.id)).toEqual(['new']);
    expect(save).toHaveBeenCalledWith(newSettings);
  });

  it('includeSettings が false なら設定は変えない', async () => {
    const { repository, settingsStore, save } = setup();
    await applyImport({ repository, settingsStore, backup, mode: 'merge', includeSettings: false });
    expect(save).not.toHaveBeenCalled();
    expect(await repository.getAll()).toHaveLength(2);
  });

  it('ファイルに設定がなければ保存しない', async () => {
    const { repository, settingsStore, save } = setup();
    await applyImport({
      repository, settingsStore, backup: { ...backup, settings: null }, mode: 'merge', includeSettings: true,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('設定の保存に失敗したら記録を元に戻して reject する', async () => {
    const { repository, settingsStore } = setup(async () => {
      throw new Error('fail');
    });
    await expect(
      applyImport({ repository, settingsStore, backup, mode: 'replace', includeSettings: true }),
    ).rejects.toThrow('fail');
    expect((await repository.getAll()).map((r) => r.id)).toEqual(['old']);
  });
});
