import { recordHref } from '../recordRoute';

describe('recordHref', () => {
  it('読んでる本は /reading/<id>', () => {
    expect(recordHref({ id: 'a1', status: 'in_progress' })).toBe('/reading/a1');
  });

  it.each(['completed', 'planned', 'dropped'] as const)('%s は /records/<id>', (status) => {
    expect(recordHref({ id: 'a1', status })).toBe('/records/a1');
  });
});
