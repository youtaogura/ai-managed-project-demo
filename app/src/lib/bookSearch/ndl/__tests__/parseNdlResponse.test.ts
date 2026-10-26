import { NdlParseError, parseNdlResponse } from '../parseNdlResponse';

const wrap = (items: string) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<channel><title>search</title>${items}</channel></rss>`;

const item1 = `<item><title>本1</title><author>著者1 著</author><dc:publisher>出版1</dc:publisher>
<dc:date>2019.5</dc:date><dc:identifier xsi:type="dcndl:NDLBibID">123</dc:identifier>
<dc:identifier xsi:type="dcndl:ISBN">978-4-06-519981-7</dc:identifier></item>`;
const item2 = `<item><title>本2</title><pubDate>Mon, 01 Jan 2018 00:00:00 +0900</pubDate>
<dc:identifier xsi:type="dcndl:ISBN">4065199816</dc:identifier></item>`;

describe('parseNdlResponse', () => {
  it('複数件を順序どおり変換する', () => {
    expect(parseNdlResponse(wrap(item1 + item2))).toEqual([
      {
        title: '本1',
        author: '著者1 著',
        publisher: '出版1',
        publishedYear: '2019',
        isbn: '9784065199817',
        ndlId: '123',
      },
      {
        title: '本2',
        author: null,
        publisher: null,
        publishedYear: '2018',
        isbn: '9784065199817',
        ndlId: null,
      },
    ]);
  });

  it('ndlId は NDLBibID 型の最初の非空テキスト。なければ null', () => {
    const xml = wrap(`<item><title>a</title></item>
<item><title>b</title><dc:identifier xsi:type="dcndl:NDLBibID"> </dc:identifier><dc:identifier xsi:type="dcndl:NDLBibID">999</dc:identifier></item>
<item><title>c</title><dc:identifier xsi:type="dcndl:ISBN">9784065199817</dc:identifier></item>`);
    expect(parseNdlResponse(xml).map((c) => c.ndlId)).toEqual([null, '999', null]);
  });

  it('1 件でも配列になる', () => {
    expect(parseNdlResponse(wrap(item1))).toHaveLength(1);
  });

  it('0 件は空配列', () => {
    expect(parseNdlResponse(wrap(''))).toEqual([]);
  });

  it('ISBN がない・無効・ISBN 型でない identifier は null', () => {
    const xml = wrap(`<item><title>a</title></item>
<item><title>b</title><dc:identifier xsi:type="dcndl:ISBN">123</dc:identifier></item>
<item><title>c</title><dc:identifier xsi:type="dcndl:NDLBibID">9784065199817</dc:identifier></item>
<item><title>d</title><dc:identifier>x</dc:identifier><dc:identifier xsi:type="dcndl:ISBN"></dc:identifier></item>`);
    expect(parseNdlResponse(xml).map((c) => c.isbn)).toEqual([null, null, null, null]);
  });

  it('出版年が 4 桁で取れなければ null、空の著者・出版社は null', () => {
    const xml = wrap(
      '<item><title>a</title><author> </author><dc:publisher></dc:publisher><dc:date>令和</dc:date></item>',
    );
    expect(parseNdlResponse(xml)[0]).toMatchObject({
      author: null,
      publisher: null,
      publishedYear: null,
    });
  });

  it('title が欠落・空の item は除外する', () => {
    expect(parseNdlResponse(wrap(`<item><author>x</author></item><item><title> </title></item>${item1}`))).toHaveLength(1);
  });

  it('不正な XML・空文字・RSS でない文書は NdlParseError', () => {
    expect(() => parseNdlResponse('<rss><channel></rss>')).toThrow(NdlParseError);
    expect(() => parseNdlResponse('')).toThrow(NdlParseError);
    expect(() => parseNdlResponse('<html><body>x</body></html>')).toThrow(NdlParseError);
  });
});
