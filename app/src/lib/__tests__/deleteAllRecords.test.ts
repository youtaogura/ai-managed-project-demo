import { createMemoryStorage, createMockPhotoService, makeRecord } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { deleteAllRecords } from '../deleteAllRecords';
import { createRecordRepository, RECORDS_STORAGE_KEY } from '../recordRepository';
import { createShelfRepository } from '../shelfRepository';
import { defaultStarterSettings } from '../starterDefaults';
import { createStarterSettingsStore } from '../starterSettingsStore';
import { createSettingsStore } from '../settingsStore';

const records = [
  makeRecord({ id: 'a', photoUri: 'file:///a.jpg' }),
  makeRecord({ id: 'b', photoUri: null }),
  makeRecord({ id: 'c', photoUri: 'file:///c.jpg' }),
];

function setup(initial = records) {
  const memory = createMemoryStorage({
    [RECORDS_STORAGE_KEY]: JSON.stringify(initial),
  });
  const repository = createRecordRepository(memory.storage);
  const photoService = createMockPhotoService();
  return { memory, repository, photoService };
}

describe('deleteAllRecords', () => {
  it('全記録と写真を削除し、件数を返す（写真なしには呼ばない）', async () => {
    const { repository, photoService } = setup();
    expect(await deleteAllRecords({ repository, photoService })).toBe(3);
    expect(await repository.getAll()).toEqual([]);
    expect(photoService.remove).toHaveBeenCalledTimes(2);
    expect(photoService.remove).toHaveBeenCalledWith('file:///a.jpg');
    expect(photoService.remove).toHaveBeenCalledWith('file:///c.jpg');
  });

  it('0 件なら何も呼ばない', async () => {
    const { repository, photoService } = setup([]);
    expect(await deleteAllRecords({ repository, photoService })).toBe(0);
    expect(photoService.remove).not.toHaveBeenCalled();
  });

  it('記録の削除に失敗したら reject し、写真は消さない', async () => {
    const { repository, photoService } = setup();
    jest.spyOn(repository, 'deleteAll').mockRejectedValue(new Error('x'));
    await expect(deleteAllRecords({ repository, photoService })).rejects.toThrow('x');
    expect(photoService.remove).not.toHaveBeenCalled();
  });

  it('写真の削除が 1 件失敗しても残りを続け、成功として返す', async () => {
    const { repository } = setup();
    const photoService = createMockPhotoService({
      remove: jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined),
    });
    expect(await deleteAllRecords({ repository, photoService })).toBe(3);
    expect(photoService.remove).toHaveBeenCalledTimes(2);
  });

  it('設定は変わらない', async () => {
    const { memory, repository, photoService } = setup();
    const settingsStore = createSettingsStore(memory.storage);
    await settingsStore.save({
      ...DEFAULT_SETTINGS,
      defaultStatus: 'planned',
    });
    const before = await settingsStore.load();
    await deleteAllRecords({ repository, photoService });
    expect(await settingsStore.load()).toEqual(before);
  });

  it('本棚と書き出し設定は残る', async () => {
    const { memory, repository, photoService } = setup();
    const shelfRepository = createShelfRepository(memory.storage);
    await shelfRepository.create('積ん読');
    const starterStore = createStarterSettingsStore(memory.storage);
    await starterStore.save({ ...defaultStarterSettings(), count: 5 });
    await deleteAllRecords({ repository, photoService });
    expect((await shelfRepository.getAll()).map((s) => s.name)).toEqual(['積ん読']);
    expect((await starterStore.load()).count).toBe(5);
  });
});
