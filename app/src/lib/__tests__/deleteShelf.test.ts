import { createMemoryStorage, makeRecord } from '../../testUtils';
import { deleteShelf } from '../deleteShelf';
import { createRecordRepository, RECORDS_STORAGE_KEY } from '../recordRepository';
import { createShelfRepository } from '../shelfRepository';

async function setup() {
  const memory = createMemoryStorage({
    [RECORDS_STORAGE_KEY]: JSON.stringify([
      makeRecord({ id: 'a', shelfIds: ['s1', 's2'] }),
      makeRecord({ id: 'b', shelfIds: ['s2'] }),
      makeRecord({ id: 'c', shelfIds: [] }),
    ]),
  });
  let n = 0;
  const shelfRepository = createShelfRepository(memory.storage, {
    generateId: () => `s${++n}`,
  });
  await shelfRepository.create('一');
  await shelfRepository.create('二');
  const recordRepository = createRecordRepository(memory.storage);
  return { shelfRepository, recordRepository };
}

describe('deleteShelf', () => {
  it('本棚を消し、全記録の shelfIds から外す（記録は残り、ほかの本棚 ID は残る）', async () => {
    const deps = await setup();
    expect(await deleteShelf(deps, 's2')).toBe(true);
    expect((await deps.shelfRepository.getAll()).map((s) => s.id)).toEqual(['s1']);
    const records = await deps.recordRepository.getAll();
    expect(records.map((r) => [r.id, r.shelfIds])).toEqual([
      ['a', ['s1']],
      ['b', []],
      ['c', []],
    ]);
  });

  it('存在しない ID は false で、記録は変わらない', async () => {
    const deps = await setup();
    expect(await deleteShelf(deps, 'none')).toBe(false);
    expect((await deps.recordRepository.getAll())[0]?.shelfIds).toEqual(['s1', 's2']);
  });
});
