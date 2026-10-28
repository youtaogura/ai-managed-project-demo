import { createMemoryStorage, makeRecord } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { deleteAllRecords } from '../deleteAllRecords';
import { createRecordRepository, RECORDS_STORAGE_KEY } from '../recordRepository';
import { createShelfRepository } from '../shelfRepository';
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
  return { memory, repository };
}

describe('deleteAllRecords', () => {
  it('全記録を削除し、件数を返す（photoUri が入った記録もそのまま消える）', async () => {
    const { repository } = setup();
    expect(await deleteAllRecords({ repository })).toBe(3);
    expect(await repository.getAll()).toEqual([]);
  });

  it('0 件なら 0 を返す', async () => {
    const { repository } = setup([]);
    expect(await deleteAllRecords({ repository })).toBe(0);
  });

  it('記録の削除に失敗したら reject する', async () => {
    const { repository } = setup();
    jest.spyOn(repository, 'deleteAll').mockRejectedValue(new Error('x'));
    await expect(deleteAllRecords({ repository })).rejects.toThrow('x');
  });

  it('設定は変わらない', async () => {
    const { memory, repository } = setup();
    const settingsStore = createSettingsStore(memory.storage);
    await settingsStore.save({
      ...DEFAULT_SETTINGS,
      defaultStatus: 'planned',
    });
    const before = await settingsStore.load();
    await deleteAllRecords({ repository });
    expect(await settingsStore.load()).toEqual(before);
  });

  it('本棚は残る', async () => {
    const { memory, repository } = setup();
    const shelfRepository = createShelfRepository(memory.storage);
    await shelfRepository.create('積ん読');
    await deleteAllRecords({ repository });
    expect((await shelfRepository.getAll()).map((s) => s.name)).toEqual(['積ん読']);
  });
});
