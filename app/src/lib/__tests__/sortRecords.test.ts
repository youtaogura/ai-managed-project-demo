import { SORT_ORDERS } from '../../types/sort';
import { SORT_ORDER_LABELS, effectiveSortOrder, sortRecords } from '../sortRecords';
import { makeRecord } from '../../testUtils';

const ids = (order: Parameters<typeof sortRecords>[1], records = sample) =>
  sortRecords(records, order).map((r) => r.id);

const sample = [
  makeRecord({
    id: 'a',
    startDate: '2024-01-01',
    endDate: '2024-02-01',
    rating: 3,
    title: 'b',
  }),
  makeRecord({
    id: 'b',
    startDate: '2024-03-01',
    endDate: '2024-04-01',
    rating: 5,
    title: 'a',
  }),
  makeRecord({
    id: 'c',
    startDate: null,
    endDate: null,
    rating: null,
    title: 'c',
  }),
  makeRecord({
    id: 'd',
    startDate: '2023-01-01',
    endDate: '2023-02-01',
    rating: 1,
    title: 'd',
  }),
];

describe('sortRecords', () => {
  it.each([
    ['endDate_desc', ['b', 'a', 'd', 'c']],
    ['endDate_asc', ['d', 'a', 'b', 'c']],
    ['startDate_desc', ['b', 'a', 'd', 'c']],
    ['startDate_asc', ['d', 'a', 'b', 'c']],
    ['rating_desc', ['b', 'a', 'd', 'c']],
    ['rating_asc', ['d', 'a', 'b', 'c']],
    ['title_asc', ['b', 'a', 'c', 'd']],
  ] as const)('%s の順序（null は末尾）', (order, expected) => {
    expect(ids(order)).toEqual(expected);
  });

  it('createdAt_desc は登録が新しい順', () => {
    const records = [
      makeRecord({ id: 'x', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeRecord({ id: 'y', createdAt: '2024-03-01T00:00:00.000Z' }),
      makeRecord({ id: 'z', createdAt: '2024-02-01T00:00:00.000Z' }),
    ];
    expect(ids('createdAt_desc', records)).toEqual(['y', 'z', 'x']);
  });

  it('同値は createdAt の新しい順、それも同じなら id 順', () => {
    const records = [
      makeRecord({
        id: 'old',
        endDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      makeRecord({
        id: 'new',
        endDate: '2024-01-01',
        createdAt: '2024-02-01T00:00:00.000Z',
      }),
      makeRecord({
        id: 'n2',
        endDate: null,
        createdAt: '2024-02-01T00:00:00.000Z',
      }),
      makeRecord({
        id: 'n1',
        endDate: null,
        createdAt: '2024-02-01T00:00:00.000Z',
      }),
    ];
    expect(ids('endDate_asc', records)).toEqual(['new', 'old', 'n1', 'n2']);
  });

  it('タイトルは英字がかなより前、かな同士は五十音順、大小・かな種別は同値', () => {
    const records = [
      makeRecord({ id: '1', title: 'ん' }),
      makeRecord({ id: '2', title: 'あ' }),
      makeRecord({ id: '3', title: 'Zebra' }),
      makeRecord({ id: '4', title: 'apple' }),
      makeRecord({
        id: '5',
        title: ' か ',
        createdAt: '2024-05-01T00:00:00.000Z',
      }),
      makeRecord({
        id: '6',
        title: 'カ',
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    ];
    expect(ids('title_asc', records)).toEqual(['4', '3', '2', '5', '6', '1']);
  });

  it('入力配列を破壊しない', () => {
    const input = [...sample];
    sortRecords(input, 'title_asc');
    expect(input).toEqual(sample);
  });

  it('全ての並び順に表示文言がある', () => {
    for (const order of SORT_ORDERS) expect(SORT_ORDER_LABELS[order]).toBeTruthy();
  });
});

describe('effectiveSortOrder', () => {
  const on = {
    rating: true,
    status: true,
    startDate: true,
    endDate: true,
    review: true,
    photo: true,
  };

  it('項目がオンなら保存された並び順のまま', () => {
    for (const order of SORT_ORDERS) expect(effectiveSortOrder(order, on)).toBe(order);
  });

  it('オフの項目の並び順は、初期の並び順（endDate_desc）に戻す', () => {
    expect(effectiveSortOrder('startDate_asc', { ...on, startDate: false })).toBe('endDate_desc');
    expect(effectiveSortOrder('rating_desc', { ...on, rating: false })).toBe('endDate_desc');
  });

  it('終えた日がオフなら登録日時の新しい順になる', () => {
    expect(effectiveSortOrder('endDate_asc', { ...on, endDate: false })).toBe('createdAt_desc');
    expect(effectiveSortOrder('rating_asc', { ...on, rating: false, endDate: false })).toBe(
      'createdAt_desc',
    );
  });

  it('オフにしていない項目の並び順は保たれる', () => {
    expect(effectiveSortOrder('title_asc', { ...on, endDate: false })).toBe('title_asc');
    expect(effectiveSortOrder('rating_asc', { ...on, startDate: false })).toBe('rating_asc');
  });
});
