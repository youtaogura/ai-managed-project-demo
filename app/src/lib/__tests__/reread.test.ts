import { makeRecord } from '../../testUtils';
import { hasRereadContent, listPostReadMemos } from '../reread';

const at = (n: number) => `2024-01-0${n}T00:00:00.000Z`;

describe('listPostReadMemos', () => {
  it('読後メモを createdAt の昇順に並べ、空白だけのものは除く', () => {
    const record = makeRecord({
      postReadMemos: [
        { id: 'p1', text: 'いちばん心に残ったのは、続き', createdAt: at(3) },
        { id: 'p2', text: '   ', createdAt: at(1) },
        { id: 'p3', text: '自由', createdAt: at(2) },
      ],
      quotes: [{ id: 'q1', text: '引用', page: null, comment: null, createdAt: at(1) }],
    });
    expect(listPostReadMemos(record).map((m) => m.id)).toEqual(['p3', 'p1']);
  });

  it('同じ createdAt なら保存の順', () => {
    const record = makeRecord({
      postReadMemos: [
        { id: 'b', text: 'x', createdAt: at(1) },
        { id: 'a', text: 'z', createdAt: at(1) },
      ],
    });
    expect(listPostReadMemos(record).map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('hasRereadContent', () => {
  it('引用が空白だけなら false', () => {
    const quotes = [{ id: 'q', text: ' ', page: null, comment: null, createdAt: at(1) }];
    expect(hasRereadContent(makeRecord({ quotes }))).toBe(false);
  });

  it('何も書いていなければ false（空白だけの読後メモも数えない）', () => {
    expect(
      hasRereadContent(makeRecord({ oneLiner: '  ', postReadMemos: [{ id: 'p', text: ' ', createdAt: at(1) }] })),
    ).toBe(false);
  });

  it.each([
    ['この本をひとことで', { oneLiner: 'よい' }],
    ['読後メモ', { postReadMemos: [{ id: 'p', text: 'x', createdAt: at(1) }] }],
    ['引用', { quotes: [{ id: 'q', text: 'x', page: null, comment: null, createdAt: at(1) }] }],
    ['メモ', { memos: [{ id: 'm', text: 'x', page: null, createdAt: at(1) }] }],
  ])('%s があれば true', (_name, overrides) => {
    expect(hasRereadContent(makeRecord(overrides))).toBe(true);
  });
});
