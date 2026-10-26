import { makeRecord } from '../../testUtils';
import { countShelfRecords, moveShelf, recordsInShelf, shelfNames } from '../shelfSelectors';

const shelves = [
  { id: 'a', name: 'SF', order: 0 },
  { id: 'b', name: '哲学', order: 1 },
];
const records = [
  makeRecord({ id: '1', shelfIds: ['a', 'b'] }),
  makeRecord({ id: '2', shelfIds: ['b', 'gone'] }),
  makeRecord({ id: '3', shelfIds: [] }),
];

describe('shelfSelectors', () => {
  it('recordsInShelf: null は全記録、ID はその本棚の記録だけ', () => {
    expect(recordsInShelf(records, null)).toHaveLength(3);
    expect(recordsInShelf(records, 'a').map((r) => r.id)).toEqual(['1']);
    expect(recordsInShelf(records, 'b').map((r) => r.id)).toEqual(['1', '2']);
  });

  it('countShelfRecords: 存在する本棚だけ数える', () => {
    expect(countShelfRecords(records, shelves)).toEqual({ a: 1, b: 2 });
    expect(countShelfRecords(records, [])).toEqual({});
  });

  it('shelfNames: 本棚の順で、存在しない ID は除く', () => {
    expect(shelfNames({ shelfIds: ['b', 'gone', 'a'] }, shelves)).toEqual(['SF', '哲学']);
    expect(shelfNames({ shelfIds: [] }, shelves)).toEqual([]);
  });

  it('moveShelf: 1 つ入れ替え、端と無い ID は変えない', () => {
    expect(moveShelf(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(moveShelf(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
    expect(moveShelf(['a', 'b'], 'a', 'up')).toEqual(['a', 'b']);
    expect(moveShelf(['a', 'b'], 'b', 'down')).toEqual(['a', 'b']);
    expect(moveShelf(['a', 'b'], 'x', 'up')).toEqual(['a', 'b']);
  });
});
