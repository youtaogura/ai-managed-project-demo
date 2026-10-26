import { makeRecord } from '../../testUtils';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { completionDate, localDateString } from '../completion';

const on = DEFAULT_SETTINGS.enabledFields;
const off = { ...on, endDate: false };
const createdAt = new Date(2024, 4, 10, 23, 30, 0).toISOString();

describe('localDateString', () => {
  it('ISO 日時を端末のローカル日付にする', () => {
    expect(localDateString(createdAt)).toBe('2024-05-10');
  });
});

describe('completionDate', () => {
  it('終えた日がオンなら endDate（null なら日付なし）', () => {
    expect(completionDate(makeRecord({ endDate: '2024-02-01', createdAt }), on)).toBe('2024-02-01');
    expect(completionDate(makeRecord({ endDate: null, status: 'completed', createdAt }), on)).toBe(
      null,
    );
  });

  it('設定を省略するとすべてオン', () => {
    expect(completionDate(makeRecord({ endDate: '2024-02-01' }))).toBe('2024-02-01');
  });

  it('終えた日がオフなら、完了済みの記録は登録日のローカル日付', () => {
    expect(
      completionDate(makeRecord({ status: 'completed', endDate: '2020-01-01', createdAt }), off),
    ).toBe('2024-05-10');
  });

  it('終えた日がオフで完了していない記録は日付なし', () => {
    for (const status of ['planned', 'in_progress', 'dropped'] as const) {
      expect(completionDate(makeRecord({ status, endDate: '2024-02-01', createdAt }), off)).toBe(
        null,
      );
    }
  });
});
