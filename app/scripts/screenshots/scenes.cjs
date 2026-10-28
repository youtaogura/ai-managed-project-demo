// 撮影するシーンの宣言。名前は docs/design-system/screens/ の画像名（拡張子なし）と同じ。
const {
  SHELVES,
  makeFinishedRecord,
  makeReadingRecord,
  makeRecord,
  makeRereadEmptyRecord,
  makeRereadRecord,
  makeReviewRecords,
  makeShelfRecords,
  makeWriteRecord,
} = require('./seed.cjs');

// アプリ側の定数と同じ値（一致は scenes.test.ts で確かめる）
const STORAGE_KEYS = {
  records: 'records.v1',
  shelves: 'shelves.v1',
  lastExportedAt: 'lastExportedAt.v1',
  /** 読後メモを書く画面の下書き。キーは writeDraftPrefix + 記録 ID */
  writeDraftPrefix: 'writeDraft.v2.',
};

/**
 * シーンの形:
 *  - data: { records, shelves, lastExportedAt, writeDrafts } を返す関数（撮影時に評価する）。
 *    writeDrafts は { 記録 ID: 下書き }（読後メモを書く画面の書きかけ）
 *  - url: 開くパス
 *  - actions: 撮影前の操作。{ label } は accessibilityLabel、{ text } は表示文言で選んでクリックする
 *  - search: { keyword, results }。検索画面で NDL の API をこの結果に差し替え、キーワードを入れて検索する
 *  - waitFor: 撮影前に表示を待つ文言
 */
const withShelf = () => ({ records: makeShelfRecords(), shelves: SHELVES });

const NDL_SEARCH_URL = 'https://ndlsearch.ndl.go.jp/api/opensearch*';

const SCENES = [
  { name: 'shelf', data: withShelf, url: '/', waitFor: '三体' },
  { name: 'shelf-empty', data: () => ({}), url: '/', waitFor: '最初の1冊を、棚に並べよう' },
  { name: 'shelf-one', data: () => ({ records: makeShelfRecords().slice(0, 1), shelves: SHELVES }), url: '/', waitFor: '三体' },
  { name: 'shelf-new', data: withShelf, url: '/', actions: [{ label: '本棚を作る' }], waitFor: '作る' },
  {
    name: 'shelf-pick',
    data: () => ({ records: [makeRereadRecord()], shelves: SHELVES }),
    url: '/records/reread-1',
    actions: [{ text: '本棚' }],
    waitFor: '本棚に入れる',
  },
  { name: 'add-sheet', data: withShelf, url: '/', actions: [{ label: '本を追加' }], waitFor: 'タイトルで探す' },
  {
    name: 'title-search',
    data: () => ({}),
    url: '/record/search',
    search: {
      keyword: '灯台',
      results: [
        ['灯台守のレシピ帳', '坂井 ほのか', '2025'],
        ['灯台へ続く坂', '早瀬 りく', '2019'],
        ['夜の灯台', '水城 アキ', '2022'],
        ['灯台の見える町', '浅井 ゆう', '2016'],
        ['最後の灯台守', '城戸 まこと', '2011'],
      ].map(([title, author, year]) => ({ title, author, publisher: '[出版社名]', year })),
    },
    waitFor: '「灯台」の検索結果',
  },
  {
    name: 'book-form',
    data: () => ({ records: [makeRecord({ id: 'edit-1', title: '三体', creator: '劉慈欣', publisher: '早川書房', status: 'in_progress', startDate: '2025-10-18', shelfIds: ['shelf-sf'] })], shelves: SHELVES }),
    url: '/record/edit-1',
    waitFor: '保存する',
  },
  { name: 'book-form-new', data: () => ({ records: [], shelves: SHELVES }), url: '/record/new', waitFor: '棚に並べる' },
  { name: 'reading', data: () => ({ records: [makeReadingRecord()], shelves: SHELVES }), url: '/reading/reading-1', waitFor: '読み終えた' },
  {
    name: 'note-sheet',
    data: () => ({ records: [makeReadingRecord()], shelves: SHELVES }),
    url: '/reading/reading-1',
    actions: [{ label: 'メモ・引用を書く' }],
    waitFor: '残す',
  },
  { name: 'finished', data: () => ({ records: [makeFinishedRecord()] }), url: '/finished/finished-1', waitFor: '記録を書く' },
  // write.png と同じ状態（ひとことが入り、読後メモにヒントを 1 つ入れたところ）を下書きで再現する
  {
    name: 'write',
    data: () => ({
      records: [makeWriteRecord()],
      writeDrafts: {
        'write-1': {
          oneLiner: '宇宙はとても静かで、とても怖い。',
          text: 'いちばん心に残ったのは、宇宙は暗い森だという考え方。どこにいても、見つかったら終わり。\nこの本を渡したいのは、',
          hints: ['自分のことのように感じたのは、', '意外だったのは、', 'この本を渡したいのは、'],
          usedHints: ['この本を渡したいのは、'],
        },
      },
    }),
    url: '/write/write-1',
    waitFor: '残す',
  },
  {
    name: 'finished-favorite',
    data: () => ({ records: [makeFinishedRecord()] }),
    url: '/finished/finished-1',
    actions: [{ label: 'お気に入りにする' }],
    waitFor: '記録を書く',
  },
  { name: 'reread', data: () => ({ records: [makeRereadRecord()], shelves: SHELVES }), url: '/records/reread-1', waitFor: '宇宙はとても静かで、とても怖い。' },
  // ひとことを直すシート（oneline-edit）は、実装する Issue で actions を足す
  {
    name: 'reread-empty',
    data: () => ({ records: [makeRereadEmptyRecord()], shelves: SHELVES }),
    url: '/records/reread-1',
    waitFor: '読後メモを書く',
  },
  {
    name: 'memo-edit',
    data: () => ({ records: [makeRereadRecord()], shelves: SHELVES }),
    url: '/records/reread-1',
    actions: [{ text: 'いちばん心に残ったのは、宇宙は暗い森だという考え方。どこにいても見つかったら終わり。' }],
    waitFor: '読後メモを直す',
  },
  { name: 'oneline-edit', data: () => ({ records: [makeRereadRecord()], shelves: SHELVES }), url: '/records/reread-1', waitFor: '宇宙はとても静かで、とても怖い。' },
  { name: 'review', data: () => ({ records: makeReviewRecords() }), url: '/analytics', waitFor: '振り返り' },
  { name: 'settings', data: () => ({ ...withShelf(), lastExportedAt: '2026-10-01T09:00:00.000Z' }), url: '/settings', waitFor: '設定' },
];

/** 画面名の絞り込み。指定なしは全シーン、未知の名前はエラー。 */
function parseSceneArgs(argv, scenes = SCENES) {
  const names = argv.filter((a) => a !== '--');
  if (names.length === 0) return scenes;
  const known = new Set(scenes.map((s) => s.name));
  const unknown = names.filter((n) => !known.has(n));
  if (unknown.length > 0) {
    throw new Error(`未知の画面名: ${unknown.join(', ')}（指定できる名前: ${[...known].join(', ')}）`);
  }
  return scenes.filter((s) => names.includes(s.name));
}

module.exports = { STORAGE_KEYS, SCENES, parseSceneArgs, NDL_SEARCH_URL };
