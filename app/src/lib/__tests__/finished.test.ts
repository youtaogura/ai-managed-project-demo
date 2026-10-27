import { makeRecord } from '../../testUtils';
import { buildFinishedSummary, daysBetween } from '../finished';

const memo = (id: string) => ({ id, text: 'm', page: null, createdAt: '2024-01-01T00:00:00.000Z' });

describe('daysBetween', () => {
  it('両端を含めて数える', () => {
    expect(daysBetween('2024-10-18', '2024-10-26')).toBe(9);
    expect(daysBetween('2024-10-18', '2024-10-18')).toBe(1);
    expect(daysBetween('2023-12-31', '2024-01-01')).toBe(2);
  });

  it('逆転・不正な日付は null', () => {
    expect(daysBetween('2024-10-26', '2024-10-18')).toBeNull();
    expect(daysBetween('x', '2024-10-18')).toBeNull();
    expect(daysBetween('2024-10-18', 'x')).toBeNull();
  });
});

describe('buildFinishedSummary', () => {
  const memos = [memo('1'), memo('2'), memo('3'), memo('4')];

  it('開始と終了があれば日付・日数・メモ件数', () => {
    const r = makeRecord({ startDate: '2024-10-18', endDate: '2024-10-26', memos });
    expect(buildFinishedSummary(r)).toBe('10/18 – 10/26 · 9 日間 · メモ 4 件');
  });

  it('開始がなければ終了日とメモ件数', () => {
    expect(buildFinishedSummary(makeRecord({ endDate: '2024-10-26', memos }))).toBe('10/26 · メモ 4 件');
  });

  it('終了がなければメモ件数だけ（0 件も出す）', () => {
    expect(buildFinishedSummary(makeRecord({ startDate: '2024-10-18', memos }))).toBe('メモ 4 件');
    expect(buildFinishedSummary(makeRecord())).toBe('メモ 0 件');
  });

  it('終了が開始より前なら日数を出さない', () => {
    const r = makeRecord({ startDate: '2024-10-26', endDate: '2024-10-18' });
    expect(buildFinishedSummary(r)).toBe('10/26 – 10/18 · メモ 0 件');
  });
});
