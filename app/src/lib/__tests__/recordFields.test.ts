import { DEFAULT_SETTINGS } from '../../types/settings';
import { newRecordDefaults, RECORD_FIELD_LABELS, withFieldToggled } from '../recordFields';

const on = DEFAULT_SETTINGS.enabledFields;

describe('newRecordDefaults', () => {
  it('ステータスがオンなら既定値なし', () => {
    expect(newRecordDefaults(on, '2024-05-10')).toEqual({});
  });

  it('ステータスがオフなら completed。終えた日がオンなら今日を入れる', () => {
    expect(newRecordDefaults({ ...on, status: false }, '2024-05-10')).toEqual({
      status: 'completed',
      endDate: '2024-05-10',
    });
  });

  it('ステータスも終えた日もオフなら終了日は null', () => {
    expect(newRecordDefaults({ ...on, status: false, endDate: false }, '2024-05-10')).toEqual({
      status: 'completed',
      endDate: null,
    });
  });
});

describe('withFieldToggled', () => {
  it('指定した項目だけを変え、元のオブジェクトは変えない', () => {
    const next = withFieldToggled(on, 'review', false);
    expect(next).toEqual({ ...on, review: false });
    expect(on.review).toBe(true);
  });
});

it('設定画面用のラベル', () => {
  expect(Object.values(RECORD_FIELD_LABELS)).toEqual([
    'レーティング',
    'ステータス',
    '始めた日',
    '終えた日',
    '感想',
    '写真',
  ]);
});
