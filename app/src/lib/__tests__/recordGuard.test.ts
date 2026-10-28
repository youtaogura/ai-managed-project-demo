import { isMediaRecord, parseRecords } from '../recordGuard';

const valid = {
  id: 'a',
  title: 'タイトル',
  creator: null,
  publisher: null,
  isbn: null,
  coverUrl: null,
  photoUri: null,
  startDate: '2024-01-01',
  endDate: '2024-01-02',
  status: 'completed',
  rating: 4.5,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  source: { provider: 'manual' },
  oneLiner: 'よかった',
  starters: [
    {
      id: 's1',
      starter: 'いちばん心に残ったのは、',
      text: '嵐',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  quotes: [
    {
      id: 'q1',
      text: '引用',
      page: '12',
      comment: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  memos: [
    {
      id: 'm1',
      text: 'メモ',
      page: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  freeTexts: [{ id: 'f1', text: '文章', createdAt: '2024-01-01T00:00:00.000Z' }],
  favorite: true,
  spineColor: 'spine-3',
  shelfIds: ['shelf-1'],
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
    ['title 空白', { ...valid, title: ' ' }],
    ['title 数値', { ...valid, title: 1 }],
    ['status 不正', { ...valid, status: 'done' }],
    ['createdAt 不正', { ...valid, createdAt: 1 }],
    ['updatedAt 不正', { ...valid, updatedAt: undefined }],
    ['rating 文字列', { ...valid, rating: '3' }],
    ['rating 範囲外', { ...valid, rating: 6 }],
    ['rating undefined', { ...valid, rating: undefined }],
    ['creator 数値', { ...valid, creator: 1 }],
    ['oneLiner 欠落', { ...valid, oneLiner: undefined }],
    ['oneLiner 数値', { ...valid, oneLiner: 1 }],
    ['starters 欠落', { ...valid, starters: undefined }],
    ['starters の要素が不正', { ...valid, starters: [{ id: 's' }] }],
    [
      'quotes の page が数値',
      {
        ...valid,
        quotes: [{ id: 'q', text: 't', page: 1, comment: null, createdAt: 'x' }],
      },
    ],
    ['memos が配列でない', { ...valid, memos: {} }],
    ['memos の要素が不正', { ...valid, memos: [{ id: 'm', text: 1, page: null, createdAt: 'x' }] }],
    ['freeTexts の要素が不正', { ...valid, freeTexts: [null] }],
    ['favorite が文字列', { ...valid, favorite: 'true' }],
    ['spineColor 不正', { ...valid, spineColor: 'spine-11' }],
    ['shelfIds が配列でない', { ...valid, shelfIds: 'a' }],
    ['shelfIds に数値', { ...valid, shelfIds: [1] }],
    [
      '古い形式（review あり・新フィールドなし）',
      {
        id: 'a',
        title: 'T',
        review: 'x',
        status: 'completed',
        rating: null,
        createdAt: 'a',
        updatedAt: 'b',
      },
    ],
    ['日付逆転', { ...valid, startDate: '2024-02-01', endDate: '2024-01-01' }],
  ])('%s は無効', (_name, value) => {
    expect(isMediaRecord(value)).toBe(false);
  });
});

describe('引用の starter', () => {
  const withStarter = (starter: unknown) => ({
    ...valid,
    quotes: [{ id: 'q', text: 't', page: null, comment: null, starter, createdAt: 'x' }],
  });

  it.each([[undefined], [null], ['好きなのは、']])('%p を受け入れる', (starter) => {
    expect(isMediaRecord(withStarter(starter))).toBe(true);
  });

  it('数値は拒否する', () => {
    expect(isMediaRecord(withStarter(1))).toBe(false);
  });

  it('parseRecords で保たれる', () => {
    expect(parseRecords([withStarter('好きなのは、')])[0].quotes[0].starter).toBe('好きなのは、');
  });
});

describe('parseRecords', () => {
  it('配列でない値は空配列', () => {
    expect(parseRecords({})).toEqual([]);
    expect(parseRecords(null)).toEqual([]);
    expect(parseRecords('x')).toEqual([]);
  });

  it('不正な記録を読み飛ばし、有効なものだけ返す', () => {
    expect(parseRecords([valid, { ...valid, id: 'b', title: '' }, 1, { ...valid, id: 'c' }])).toEqual([
      valid,
      { ...valid, id: 'c' },
    ]);
  });

  it('古い kind は無視し、出力に含めない', () => {
    const [record] = parseRecords([{ ...valid, kind: 'movie' }]);
    expect(record).toEqual(valid);
    expect(record).not.toHaveProperty('kind');
  });

  it('古い tmdb の source は isbn から補う', () => {
    const tmdb = { provider: 'tmdb', mediaType: 'movie', tmdbId: '1' };
    expect(parseRecords([{ ...valid, source: tmdb }])).toEqual([valid]);
    expect(parseRecords([{ ...valid, isbn: '9784101010014', source: tmdb }])[0]?.source).toEqual({
      provider: 'openbd',
      isbn: '9784101010014',
    });
  });

  it('未知のフィールドを除去する', () => {
    const [record] = parseRecords([{ ...valid, extra: 'x' }]);
    expect(record).toEqual(valid);
    expect(record).not.toHaveProperty('extra');
  });
});

describe('source の補完', () => {
  const { source: _source, ...legacy } = valid;

  it('source なしは ISBN があれば openbd、なければ manual', () => {
    expect(parseRecords([{ ...legacy, isbn: '9784065199817' }])[0]?.source).toEqual({
      provider: 'openbd',
      isbn: '9784065199817',
    });
    expect(parseRecords([legacy])[0]?.source).toEqual({ provider: 'manual' });
    expect(parseRecords([{ ...legacy, isbn: '' }])[0]?.source).toEqual({
      provider: 'manual',
    });
  });

  it('不正な source は捨てずに補い、ほかの項目は変わらない', () => {
    const [record] = parseRecords([{ ...valid, isbn: '1', source: { provider: 'ndl', ndlId: '' } }]);
    expect(record).toEqual({
      ...valid,
      isbn: '1',
      source: { provider: 'openbd', isbn: '1' },
    });
  });

  it('有効な source は保持する', () => {
    const source = { provider: 'ndl', ndlId: '7' };
    expect(parseRecords([{ ...valid, source }])[0]?.source).toEqual(source);
  });
});
