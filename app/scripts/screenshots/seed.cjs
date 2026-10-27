// 撮影用のシードデータを作る。MediaRecord の全フィールドを埋める。
const BASE_TIME = '2025-03-01T09:00:00.000Z';

function makeRecord(overrides = {}) {
  return {
    id: 'book-1',
    title: '本のタイトル',
    creator: null,
    publisher: null,
    isbn: null,
    coverUrl: null,
    photoUri: null,
    startDate: null,
    endDate: null,
    status: 'planned',
    rating: null,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    source: { provider: 'manual' },
    oneLiner: null,
    starters: [],
    quotes: [],
    memos: [],
    freeTexts: [],
    favorite: false,
    spineColor: 'spine-1',
    shelfIds: [],
    ...overrides,
  };
}

const SHELVES = [
  { id: 'shelf-sf', name: 'SF', order: 0 },
  { id: 'shelf-phil', name: '哲学', order: 1 },
];

const entryTime = '2025-10-20T12:00:00.000Z';

function makeShelfRecords() {
  return [
    makeRecord({
      id: 'b1',
      title: '三体',
      creator: '劉慈欣',
      publisher: '早川書房',
      status: 'in_progress',
      startDate: '2025-10-18',
      spineColor: 'spine-1',
      shelfIds: ['shelf-sf'],
    }),
    makeRecord({
      id: 'b2',
      title: '百年の孤独',
      creator: 'ガブリエル・ガルシア＝マルケス',
      status: 'completed',
      startDate: '2025-09-01',
      endDate: '2025-09-20',
      rating: 4.5,
      favorite: true,
      spineColor: 'spine-2',
    }),
    makeRecord({
      id: 'b3',
      title: 'ソラリス',
      creator: 'スタニスワフ・レム',
      status: 'completed',
      startDate: '2025-08-01',
      endDate: '2025-08-12',
      rating: 4,
      spineColor: 'spine-3',
      shelfIds: ['shelf-sf'],
    }),
    makeRecord({ id: 'b4', title: '方法序説', creator: 'デカルト', status: 'planned', spineColor: 'spine-4', shelfIds: ['shelf-phil'] }),
    makeRecord({ id: 'b5', title: '夜と霧', creator: 'ヴィクトール・E・フランクル', status: 'dropped', spineColor: 'spine-5' }),
    makeRecord({ id: 'b6', title: 'ドグラ・マグラ', creator: '夢野久作', status: 'planned', spineColor: 'spine-6' }),
    makeRecord({
      id: 'b7',
      title: 'やがて哀しき外国語',
      creator: '村上春樹',
      status: 'completed',
      startDate: '2025-06-01',
      endDate: '2025-06-10',
      rating: 3.5,
      spineColor: 'spine-7',
    }),
    makeRecord({ id: 'b8', title: '銀河鉄道の夜', creator: '宮沢賢治', status: 'in_progress', startDate: '2025-10-25', spineColor: 'spine-8' }),
  ];
}

function makeReadingRecord() {
  return makeRecord({
    id: 'reading-1',
    title: '三体',
    creator: '劉慈欣',
    publisher: '早川書房',
    status: 'in_progress',
    startDate: '2025-10-18',
    oneLiner: null,
    starters: [{ id: 's1', starter: 'いちばん心に残ったのは、', text: '宇宙は暗い森だという考え方。', createdAt: entryTime }],
    quotes: [{ id: 'q1', text: '弱小と無知は生存の障害ではない。傲慢こそが障害だ。', page: '312', comment: null, createdAt: entryTime }],
    memos: [{ id: 'm1', text: '第2部から一気に面白くなる。', page: '120', createdAt: entryTime }],
    spineColor: 'spine-1',
    shelfIds: ['shelf-sf'],
  });
}

function makeFinishedRecord() {
  return makeRecord({
    id: 'finished-1',
    title: '三体',
    creator: '劉慈欣',
    status: 'completed',
    startDate: '2025-10-18',
    endDate: '2025-10-26',
    memos: [
      { id: 'm1', text: '第2部から一気に面白くなる。', page: '120', createdAt: entryTime },
      { id: 'm2', text: '科学者たちの描写が好き。', page: '210', createdAt: entryTime },
    ],
    spineColor: 'spine-1',
  });
}

function makeWriteRecord() {
  return makeRecord({
    id: 'write-1',
    title: '三体',
    creator: '劉慈欣',
    status: 'completed',
    startDate: '2025-10-18',
    endDate: '2025-10-26',
    rating: 4.5,
    oneLiner: '宇宙はとても静かで、とても怖い。',
    spineColor: 'spine-1',
  });
}

function makeRereadRecord() {
  return makeRecord({
    id: 'reread-1',
    title: '三体',
    creator: '劉慈欣',
    publisher: '早川書房',
    status: 'completed',
    startDate: '2025-10-18',
    endDate: '2025-10-26',
    rating: 4.5,
    favorite: true,
    oneLiner: '宇宙はとても静かで、とても怖い。',
    starters: [{ id: 's1', starter: 'いちばん心に残ったのは、', text: '宇宙は暗い森だという考え方。', createdAt: entryTime }],
    quotes: [{ id: 'q1', text: '弱小と無知は生存の障害ではない。傲慢こそが障害だ。', page: '312', comment: '刺さった', createdAt: entryTime }],
    memos: [{ id: 'm1', text: '第2部から一気に面白くなる。', page: '120', createdAt: entryTime }],
    freeTexts: [{ id: 'f1', text: '読み終えてしばらく、夜空を見上げられなかった。', createdAt: entryTime }],
    spineColor: 'spine-1',
    shelfIds: ['shelf-sf'],
  });
}

/** 振り返りは「今年」で集計するので、撮影時の年から作る。 */
function makeReviewRecords(year = new Date().getFullYear()) {
  const done = (id, title, month, rating, extra = {}) =>
    makeRecord({
      id,
      title,
      creator: '著者',
      status: 'completed',
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-15`,
      rating,
      spineColor: `spine-${(Number(month) % 10) + 1}`,
      ...extra,
    });
  return [
    done('r1', '三体', '01', 4.5, {
      favorite: true,
      starters: [{ id: 's1', starter: 'いちばん心に残ったのは、', text: '暗い森。', createdAt: `${year}-01-16T00:00:00.000Z` }],
      quotes: [{ id: 'q1', text: '引用', page: null, comment: null, createdAt: `${year}-01-16T00:00:00.000Z` }],
    }),
    done('r2', 'ソラリス', '01', 4),
    done('r3', '百年の孤独', '01', 5, { favorite: true }),
    done('r4', '方法序説', '01', 3, {
      starters: [{ id: 's2', starter: 'いちばん心に残ったのは、', text: '我思う。', createdAt: `${year}-01-16T00:00:00.000Z` }],
    }),
    done('r5', '夜と霧', '01', 2),
  ];
}

function makeNdlSearchXml(items) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = items
    .map(
      (i) =>
        `<item><title>${esc(i.title)}</title><dc:creator>${esc(i.author)}</dc:creator><dc:publisher>${esc(i.publisher)}</dc:publisher><dc:date>${esc(i.year)}</dc:date><category>図書</category></item>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>search</title>${body}</channel></rss>`;
}

module.exports = { makeNdlSearchXml, makeRecord, SHELVES, makeShelfRecords, makeReadingRecord, makeFinishedRecord, makeWriteRecord, makeRereadRecord, makeReviewRecords };
