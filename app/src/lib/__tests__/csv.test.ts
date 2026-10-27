import { makeRecord } from '../../testUtils';
import { recordsToCsv } from '../csv';

// テスト用の簡易 CSV パーサー（RFC 4180 の引用符・改行のみ）
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && csv[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  return rows;
}

describe('recordsToCsv', () => {
  it('BOM・日本語ヘッダー・\\r\\n・末尾の改行', () => {
    const csv = recordsToCsv([makeRecord()]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    const rows = parseCsv(csv.slice(1));
    expect(rows[0]).toEqual([
      'タイトル',
      '作者',
      '出版社',
      'ISBN',
      'ステータス',
      '始めた日',
      '終えた日',
      'どうだった？',
      'ひとこと',
      '登録日時',
      '更新日時',
    ]);
    expect(rows).toHaveLength(2);
  });

  it('日本語ラベル・null は空欄・どうだった？は数値', () => {
    const csv = recordsToCsv([
      makeRecord({
        status: 'completed',
        rating: 4.5,
        creator: '作者',
        title: '本',
      }),
    ]);
    expect(parseCsv(csv.slice(1))[1]).toEqual([
      '本',
      '作者',
      '',
      '',
      '読み終わった',
      '',
      '',
      '4.5',
      '',
      '2024-01-01T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z',
    ]);
  });

  it('カンマ・改行・引用符を含む値が往復する', () => {
    const oneLiner = 'a,b\n"c"\r\nd';
    const rows = parseCsv(recordsToCsv([makeRecord({ oneLiner, title: 'x,"y"' })]).slice(1));
    expect(rows[1]?.[0]).toBe('x,"y"');
    expect(rows[1]?.[8]).toBe(oneLiner);
  });

  it('0 件はヘッダーだけ', () => {
    expect(parseCsv(recordsToCsv([]).slice(1))).toHaveLength(1);
  });

  it("先頭が = + - @ の文字列には ' を付ける（数値は対象外）", () => {
    const rows = parseCsv(
      recordsToCsv([
        makeRecord({
          title: '=1+1',
          creator: '+a',
          publisher: '-b',
          oneLiner: '@c',
          rating: 0.5,
        }),
        makeRecord({ id: 'r2', title: '普通' }),
      ]).slice(1),
    );
    expect(rows[1]?.slice(0, 3)).toEqual(["'=1+1", "'+a", "'-b"]);
    expect(rows[1]?.[8]).toBe("'@c");
    expect(rows[1]?.[7]).toBe('0.5');
    expect(rows[2]?.[0]).toBe('普通');
  });
});
