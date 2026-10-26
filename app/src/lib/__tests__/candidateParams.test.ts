import { candidateToParams, titleOnlyParams } from '../candidateParams';

describe('candidateToParams', () => {
  it('全項目を route params に変換する（author は creator）', () => {
    expect(
      candidateToParams({
        title: 'T',
        author: 'A',
        publisher: 'P',
        publishedYear: '2020',
        isbn: '9784065199817',
      }),
    ).toEqual({ kind: 'book', title: 'T', creator: 'A', publisher: 'P', isbn: '9784065199817' });
  });

  it('null の項目は省略する', () => {
    expect(
      candidateToParams({ title: 'T', author: null, publisher: null, publishedYear: null, isbn: null }),
    ).toEqual({ kind: 'book', title: 'T' });
  });
});

describe('titleOnlyParams', () => {
  it('キーワードをタイトルにする', () => {
    expect(titleOnlyParams(' ワン ')).toEqual({ kind: 'book', title: 'ワン' });
  });
  it('空なら kind のみ', () => {
    expect(titleOnlyParams('  ')).toEqual({ kind: 'book' });
  });
});
