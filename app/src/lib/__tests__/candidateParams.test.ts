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
        ndlId: null,
      }),
    ).toEqual({
      title: 'T',
      creator: 'A',
      publisher: 'P',
      isbn: '9784065199817',
      sourceProvider: 'openbd',
      sourceId: '9784065199817',
    });
  });

  it('ndlId があれば ndl を優先し、ISBN も残す', () => {
    expect(
      candidateToParams({
        title: 'T',
        author: null,
        publisher: null,
        publishedYear: null,
        isbn: '9784065199817',
        ndlId: '123',
      }),
    ).toEqual({
      title: 'T',
      isbn: '9784065199817',
      sourceProvider: 'ndl',
      sourceId: '123',
    });
  });

  it('null の項目は省略する', () => {
    expect(
      candidateToParams({ title: 'T', author: null, publisher: null, publishedYear: null, isbn: null, ndlId: null }),
    ).toEqual({ title: 'T' });
  });
});

describe('titleOnlyParams', () => {
  it('キーワードをタイトルにする', () => {
    expect(titleOnlyParams(' ワン ')).toEqual({ title: 'ワン' });
  });
  it('空なら空のパラメータ', () => {
    expect(titleOnlyParams('  ')).toEqual({});
  });
});
