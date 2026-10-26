import { makeRecord } from '../../testUtils';
import { buildInfoRows } from '../recordInfo';

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);

describe('buildInfoRows', () => {
  it('空の項目は出さず、登録・更新日時は常に出す。「種別」は出ない', () => {
    expect(labels(buildInfoRows(makeRecord()))).toEqual(['登録日時', '更新日時']);
  });

  it('作者・著者・出版社・ISBN を出す', () => {
    const rows = buildInfoRows(
      makeRecord({ creator: '夏目漱石', publisher: '新潮社', isbn: '9784101010014' }),
    );
    expect(labels(rows)).toEqual(['作者・著者', '出版社', 'ISBN', '登録日時', '更新日時']);
    expect(rows[0]?.value).toBe('夏目漱石');
  });
});
