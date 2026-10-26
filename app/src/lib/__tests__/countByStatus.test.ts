import { makeRecord } from '../../testUtils';
import { countByStatus, filterByStatus } from '../countByStatus';

const records = [
  makeRecord({ id: 'a', status: 'completed' }),
  makeRecord({ id: 'b', status: 'in_progress' }),
  makeRecord({ id: 'c', status: 'planned' }),
  makeRecord({ id: 'd', status: 'dropped' }),
  makeRecord({ id: 'e', status: 'completed' }),
];

describe('countByStatus', () => {
  it('途中でやめた本は「すべて」にだけ数える', () => {
    expect(countByStatus(records)).toEqual({ all: 5, in_progress: 1, completed: 2, planned: 1 });
  });
});

describe('filterByStatus', () => {
  it('all はすべて、それ以外はその状態だけ', () => {
    expect(filterByStatus(records, 'all')).toHaveLength(5);
    expect(filterByStatus(records, 'completed').map((r) => r.id)).toEqual(['a', 'e']);
  });
});
