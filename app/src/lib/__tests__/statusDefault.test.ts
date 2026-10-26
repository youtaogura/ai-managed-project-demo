import {
  applyDefaultStatus,
  STATUS_DEFAULT_LABELS,
  STATUS_DEFAULT_OPTIONS,
} from '../statusDefault';

const TODAY = '2026-03-04';

describe('applyDefaultStatus', () => {
  it('in_progress は始めた日に今日を入れる', () => {
    expect(applyDefaultStatus({ title: 'T' }, 'in_progress', TODAY)).toEqual({
      title: 'T',
      status: 'in_progress',
      startDate: TODAY,
    });
  });

  it('completed は終えた日に今日を入れる', () => {
    expect(applyDefaultStatus({}, 'completed', TODAY)).toEqual({
      status: 'completed',
      endDate: TODAY,
    });
  });

  it.each(['planned', 'dropped'] as const)('%s は日付を入れない', (status) => {
    expect(applyDefaultStatus({}, status, TODAY)).toEqual({ status });
  });

  it('日付が明示されていれば上書きしない（null は未指定扱い）', () => {
    expect(applyDefaultStatus({ endDate: '2020-01-01' }, 'completed', TODAY).endDate).toBe(
      '2020-01-01',
    );
    expect(applyDefaultStatus({ endDate: null }, 'completed', TODAY).endDate).toBe(TODAY);
  });

  it('status が明示されていればそのまま返す（日付も補完しない）', () => {
    expect(applyDefaultStatus({ status: 'planned' }, 'completed', TODAY)).toEqual({
      status: 'planned',
    });
  });

  it('入力を書き換えない', () => {
    const initial = { title: 'T' };
    applyDefaultStatus(initial, 'completed', TODAY);
    expect(initial).toEqual({ title: 'T' });
  });

  it('選択肢は 4 つで、併記表記の表示名を持つ', () => {
    expect(STATUS_DEFAULT_OPTIONS.map((o) => o.label)).toEqual([
      '読みたい・見たい',
      '読んでる・見てる',
      '途中でやめた',
      '読み終わった・見終わった',
    ]);
    expect(STATUS_DEFAULT_LABELS.completed).toBe('読み終わった・見終わった');
  });
});
