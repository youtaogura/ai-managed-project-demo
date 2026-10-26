import { createFakeRepository, makeRecord } from '../testUtils';

describe('createFakeRepository', () => {
  it('removeShelfId は全記録から本棚 id を外す', async () => {
    const { repository } = createFakeRepository([makeRecord({ id: 'a', shelfIds: ['s1', 's2'] })]);
    await repository.removeShelfId('s1');
    const [record] = await repository.getAll();
    expect(record.shelfIds).toEqual(['s2']);
  });

  it('importRecords は merge で追加、replace で置き換える', async () => {
    const { repository } = createFakeRepository([makeRecord({ id: 'a' })]);
    expect(await repository.importRecords([makeRecord({ id: 'b' })], 'merge')).toBe(2);
    expect(await repository.importRecords([makeRecord({ id: 'c' })], 'replace')).toBe(1);
  });
});
