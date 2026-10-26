import { bookInfoToParams, isbnOnlyParams, notFoundParams } from '../isbnLookupParams';

describe('isbnLookupParams', () => {
  it('BookInfo を params に変換し、null は省略する', () => {
    expect(
      bookInfoToParams({
        isbn: '9784065199817',
        title: 'T',
        author: 'A',
        publisher: 'P',
        coverUrl: 'http://c',
      }),
    ).toEqual({
      title: 'T',
      isbn: '9784065199817',
      creator: 'A',
      publisher: 'P',
      coverUrl: 'http://c',
      sourceProvider: 'openbd',
      sourceId: '9784065199817',
    });
    expect(
      bookInfoToParams({ isbn: '1', title: 'T', author: null, publisher: null, coverUrl: null }),
    ).toEqual({ title: 'T', isbn: '1', sourceProvider: 'openbd', sourceId: '1' });
  });

  it('ISBN のみの params を作る', () => {
    expect(isbnOnlyParams('9784065199817')).toEqual({ isbn: '9784065199817' });
    expect(isbnOnlyParams(null)).toEqual({});
  });

  it('見つからなかったときの ISBN 画面向け params を作る', () => {
    expect(notFoundParams('9784065199817')).toEqual({ isbn: '9784065199817', notFound: '1' });
  });
});
