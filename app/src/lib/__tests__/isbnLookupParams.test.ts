import { bookInfoToParams, isbnOnlyParams } from '../isbnLookupParams';

describe('isbnLookupParams', () => {
  it('BookInfo を params に変換し、null は省略する', () => {
    expect(
      bookInfoToParams({
        isbn: '9784065199817',
        title: 'T',
        author: 'A',
        publisher: 'P',
        coverUrl: 'U',
      }),
    ).toEqual({
      kind: 'book',
      title: 'T',
      isbn: '9784065199817',
      creator: 'A',
      publisher: 'P',
      coverUrl: 'U',
    });
    expect(
      bookInfoToParams({
        isbn: '9784065199817',
        title: 'T',
        author: null,
        publisher: null,
        coverUrl: null,
      }),
    ).toEqual({ kind: 'book', title: 'T', isbn: '9784065199817' });
  });

  it('isbnOnlyParams', () => {
    expect(isbnOnlyParams('9784065199817')).toEqual({ kind: 'book', isbn: '9784065199817' });
  });
});
