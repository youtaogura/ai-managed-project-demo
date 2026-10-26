import { isMediaRecord, parseRecords } from '../recordGuard';

const valid = {
  id: 'a',
  kind: 'book',
  title: 'タイトル',
  creator: null,
  publisher: null,
  isbn: null,
  coverUrl: null,
  photoUri: null,
  startDate: '2024-01-01',
  endDate: '2024-01-02',
  status: 'completed',
  review: '良かった',
  rating: 4.5,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('isMediaRecord', () => {
  it('有効な記録を受け入れる', () => {
    expect(isMediaRecord(valid)).toBe(true);
    expect(isMediaRecord({ ...valid, rating: null })).toBe(true);
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['配列', []],
    ['文字列', 'x'],
    ['id なし', { ...valid, id: undefined }],
    ['id 空', { ...valid, id: '' }],
    ['kind 不正', { ...valid, kind: 'game' }],
    ['title 空白', { ...valid, title: ' ' }],
    ['title 数値', { ...valid, title: 1 }],
    ['status 不正', { ...valid, status: 'done' }],
    ['createdAt 不正', { ...valid, createdAt: 1 }],
    ['updatedAt 不正', { ...valid, updatedAt: undefined }],
    ['rating 文字列', { ...valid, rating: '3' }],
    ['rating 範囲外', { ...valid, rating: 6 }],
    ['rating undefined', { ...valid, rating: undefined }],
    ['creator 数値', { ...valid, creator: 1 }],
    ['review 欠落', { ...valid, review: undefined }],
    ['日付逆転', { ...valid, startDate: '2024-02-01', endDate: '2024-01-01' }],
  ])('%s は無効', (_name, value) => {
    expect(isMediaRecord(value)).toBe(false);
  });
});

describe('parseRecords', () => {
  it('配列でない値は空配列', () => {
    expect(parseRecords({})).toEqual([]);
    expect(parseRecords(null)).toEqual([]);
    expect(parseRecords('x')).toEqual([]);
  });

  it('不正な記録を読み飛ばし、有効なものだけ返す', () => {
    expect(parseRecords([valid, { ...valid, id: 'b', kind: 'x' }, 1, { ...valid, id: 'c' }])).toEqual([
      valid,
      { ...valid, id: 'c' },
    ]);
  });

  it('未知のフィールドを除去する', () => {
    const [record] = parseRecords([{ ...valid, extra: 'x' }]);
    expect(record).toEqual(valid);
    expect(record).not.toHaveProperty('extra');
  });
});
