import { makeRecord } from '../../testUtils';
import { buildInfoRows } from '../recordInfo';

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);

describe('buildInfoRows', () => {
  it('空の項目は出さず、登録・更新日時は常に出す', () => {
    expect(labels(buildInfoRows(makeRecord()))).toEqual(['種別', '登録日時', '更新日時']);
  });

  it('本は作者・著者・出版社・ISBN を出す', () => {
    const rows = buildInfoRows(
      makeRecord({ creator: '夏目漱石', publisher: '新潮社', isbn: '9784101010014' }),
    );
    expect(labels(rows)).toEqual(['種別', '作者・著者', '出版社', 'ISBN', '登録日時', '更新日時']);
    expect(rows[0]?.value).toBe('本');
  });

  it('映画は「監督など」で、出版社・ISBN は出さない', () => {
    const rows = buildInfoRows(
      makeRecord({ kind: 'movie', creator: '黒澤明', publisher: '東宝', isbn: '1' }),
    );
    expect(labels(rows)).toEqual(['種別', '監督など', '登録日時', '更新日時']);
  });
});
