import { makeRecord } from '../../testUtils';
import { buildRereadEntries, hasRereadContent } from '../reread';

const at = (n: number) => `2024-01-0${n}T00:00:00.000Z`;

describe('buildRereadEntries', () => {
  it('書き出しの続き・自由記述を createdAt の昇順に並べ、空は除く。引用は含めない', () => {
    const record = makeRecord({
      starters: [
        { id: 's1', starter: 'あ', text: '続き', createdAt: at(3) },
        { id: 's2', starter: 'い', text: '   ', createdAt: at(1) },
      ],
      quotes: [{ id: 'q1', text: '引用', page: null, comment: null, createdAt: at(1) }],
      freeTexts: [
        { id: 'f1', text: '自由', createdAt: at(2) },
        { id: 'f2', text: '', createdAt: at(2) },
      ],
    });
    expect(buildRereadEntries(record).map((e) => `${e.kind}:${e.entry.id}`)).toEqual([
      'free:f1',
      'starter:s1',
    ]);
  });

  it('同じ createdAt なら元の並び（書き出し・自由記述）', () => {
    const record = makeRecord({
      starters: [{ id: 's1', starter: 'あ', text: 'x', createdAt: at(1) }],
      freeTexts: [{ id: 'f1', text: 'z', createdAt: at(1) }],
    });
    expect(buildRereadEntries(record).map((e) => e.kind)).toEqual(['starter', 'free']);
  });
});

describe('hasRereadContent', () => {
  it('引用が空白だけなら false', () => {
    const quotes = [{ id: 'q', text: ' ', page: null, comment: null, createdAt: at(1) }];
    expect(hasRereadContent(makeRecord({ quotes }))).toBe(false);
  });

  it('何も書いていなければ false', () => {
    expect(hasRereadContent(makeRecord({ oneLiner: '  ' }))).toBe(false);
  });

  it.each([
    ['ひとこと', { oneLiner: 'よい' }],
    ['書き出しの続き', { starters: [{ id: 's', starter: 'あ', text: 'x', createdAt: at(1) }] }],
    ['引用', { quotes: [{ id: 'q', text: 'x', page: null, comment: null, createdAt: at(1) }] }],
    ['自由記述', { freeTexts: [{ id: 'f', text: 'x', createdAt: at(1) }] }],
    ['メモ', { memos: [{ id: 'm', text: 'x', page: null, createdAt: at(1) }] }],
  ])('%s があれば true', (_name, overrides) => {
    expect(hasRereadContent(makeRecord(overrides))).toBe(true);
  });
});
