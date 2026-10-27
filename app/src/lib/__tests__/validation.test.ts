import { isValidDateRange, isValidDateString, isValidRating, isValidRecordInput } from '../validation';

describe('isValidRating', () => {
  it.each([null, 1.0, 1.5, 3, 5.0, 4.7, 2.3])('%s は有効', (v) => {
    expect(isValidRating(v)).toBe(true);
  });
  it.each([0.9, 5.1, 3.25, 0, NaN, Infinity, '3', undefined])('%s は無効', (v) => {
    expect(isValidRating(v)).toBe(false);
  });
});

describe('isValidDateString', () => {
  it.each(['2024-02-29', '2024-01-01'])('%s は有効', (v) => {
    expect(isValidDateString(v)).toBe(true);
  });
  it.each(['2024-02-30', '2023-02-29', '2024-13-01', '2024/01/01', '2024-1-1', 20240101, null])(
    '%s は無効',
    (v) => {
      expect(isValidDateString(v)).toBe(false);
    },
  );
});

describe('isValidDateRange', () => {
  it('終了日が開始日以降なら有効（同日も有効）', () => {
    expect(isValidDateRange('2024-01-01', '2024-01-02')).toBe(true);
    expect(isValidDateRange('2024-01-01', '2024-01-01')).toBe(true);
  });
  it('終了日が開始日より前なら無効', () => {
    expect(isValidDateRange('2024-01-02', '2024-01-01')).toBe(false);
  });
  it('片方のみ・両方 null は有効', () => {
    expect(isValidDateRange('2024-01-01', null)).toBe(true);
    expect(isValidDateRange(null, '2024-01-01')).toBe(true);
    expect(isValidDateRange(null, null)).toBe(true);
  });
  it('実在しない日付・形式違いは無効', () => {
    expect(isValidDateRange('2024-02-30', null)).toBe(false);
    expect(isValidDateRange(null, '2024-02-30')).toBe(false);
    expect(isValidDateRange('2024/01/01', '2024-01-02')).toBe(false);
  });
});

describe('isValidRecordInput', () => {
  const base = { title: '本', rating: 3, startDate: null, endDate: null };
  it('正しい入力は有効', () => {
    expect(isValidRecordInput(base)).toBe(true);
  });
  it('タイトルが空・空白のみなら無効', () => {
    expect(isValidRecordInput({ ...base, title: '' })).toBe(false);
    expect(isValidRecordInput({ ...base, title: '  ' })).toBe(false);
  });
  it('レーティング不正なら無効', () => {
    expect(isValidRecordInput({ ...base, rating: 0 })).toBe(false);
  });
  it('spineColor は未指定か 10 色のどれかなら有効、それ以外は無効', () => {
    expect(isValidRecordInput({ ...base, spineColor: 'spine-10' })).toBe(true);
    expect(isValidRecordInput({ ...base, spineColor: undefined })).toBe(true);
    expect(isValidRecordInput({ ...base, spineColor: 'spine-11' as never })).toBe(false);
  });
  it('日付逆転なら無効', () => {
    expect(isValidRecordInput({ ...base, startDate: '2024-01-02', endDate: '2024-01-01' })).toBe(false);
  });
});
