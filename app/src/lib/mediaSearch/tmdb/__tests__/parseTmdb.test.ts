import { parseCreators, parseSearchResults } from '../parseTmdb';

describe('parseSearchResults', () => {
  it('movie の候補に変換する', () => {
    const json = {
      results: [
        {
          id: 603,
          title: 'マトリックス',
          original_title: 'The Matrix',
          release_date: '1999-03-30',
          poster_path: '/p.jpg',
          genre_ids: [28, 16],
        },
      ],
    };
    expect(parseSearchResults(json, 'movie')).toEqual([
      {
        mediaType: 'movie',
        tmdbId: '603',
        title: 'マトリックス',
        creator: null,
        year: '1999',
        posterUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
        isAnimation: true,
      },
    ]);
  });

  it('tv は name / first_air_date を使う', () => {
    const json = {
      results: [{ id: 1, name: '名前', first_air_date: '2020-01-01' }],
    };
    expect(parseSearchResults(json, 'tv')).toEqual([
      expect.objectContaining({
        mediaType: 'tv',
        title: '名前',
        year: '2020',
        isAnimation: false,
      }),
    ]);
  });

  it('日本語タイトルが空・空白なら原題、両方空なら捨てる', () => {
    const json = {
      results: [
        { id: 1, title: ' ', original_title: 'Orig' },
        { id: 2, title: '', original_title: ' ' },
        { id: 3, original_title: 'Only' },
      ],
    };
    expect(parseSearchResults(json, 'movie')?.map((c) => c.title)).toEqual(['Orig', 'Only']);
    const tv = { results: [{ id: 4, name: '', original_name: 'OrigTv' }] };
    expect(parseSearchResults(tv, 'tv')?.[0]?.title).toBe('OrigTv');
  });

  it('形が不正な要素は捨てる', () => {
    const json = {
      results: [
        null,
        'x',
        5,
        [],
        { title: 'IDなし' },
        { id: '1', title: '文字列ID' },
        { id: 1.5, title: 'x' },
        { id: 2, title: 'OK' },
      ],
    };
    expect(parseSearchResults(json, 'movie')?.map((c) => c.tmdbId)).toEqual(['2']);
  });

  it.each([
    ['2020-05-01', '2020'],
    ['20', null],
    ['abcd-01', null],
    ['', null],
    [5, null],
    [null, null],
  ])('year: release_date=%p → %p', (date, expected) => {
    const json = { results: [{ id: 1, title: 'T', release_date: date }] };
    expect(parseSearchResults(json, 'movie')?.[0]?.year).toBe(expected);
  });

  it.each([[null], [''], [5], [undefined]])('poster_path=%p は null', (path) => {
    const json = { results: [{ id: 1, title: 'T', poster_path: path }] };
    expect(parseSearchResults(json, 'movie')?.[0]?.posterUrl).toBeNull();
  });

  it('genre_ids が配列でなくても落ちない', () => {
    const json = { results: [{ id: 1, title: 'T', genre_ids: 'x' }] };
    expect(parseSearchResults(json, 'movie')?.[0]?.isAnimation).toBe(false);
  });

  it.each([[null], ['x'], [[]], [{}], [{ results: 'x' }], [{ results: {} }]])(
    '%p は null（不正な応答）',
    (json) => {
      expect(parseSearchResults(json, 'movie')).toBeNull();
    },
  );

  it('results が空配列なら空', () => {
    expect(parseSearchResults({ results: [] }, 'tv')).toEqual([]);
  });
});

describe('parseCreators', () => {
  it('movie は Director を「、」区切りで最大 2 人', () => {
    const json = {
      credits: {
        crew: [
          { job: 'Writer', name: '脚本' },
          { job: 'Director', name: '監督A' },
          { job: 'Director', name: '監督B' },
          { job: 'Director', name: '監督C' },
        ],
      },
    };
    expect(parseCreators(json, 'movie')).toBe('監督A、監督B');
  });

  it('tv は created_by を最大 2 人', () => {
    const json = {
      created_by: [{ name: 'A' }, { name: '' }, { name: 'B' }, { name: 'C' }],
    };
    expect(parseCreators(json, 'tv')).toBe('A、B');
  });

  it.each([
    [null],
    [[]],
    [{}],
    [{ credits: null }],
    [{ credits: {} }],
    [
      {
        credits: {
          crew: [null, { job: 'Director' }, { job: 'Editor', name: 'x' }],
        },
      },
    ],
  ])('movie: %p は null', (json) => {
    expect(parseCreators(json, 'movie')).toBeNull();
  });

  it.each([[null], [{}], [{ created_by: 'x' }], [{ created_by: [null, {}] }]])(
    'tv: %p は null',
    (json) => {
      expect(parseCreators(json, 'tv')).toBeNull();
    },
  );
});
