# Issue #7 タイトル検索で本を探す（NDL サーチ → openBD）

## 背景・目的

ISBN が手元にない本・漫画でも、タイトルのキーワードで検索して書誌情報を入力できるようにする。openBD はタイトル検索ができないため、国立国会図書館サーチ（NDL サーチ）の OpenSearch API でタイトルから候補（と ISBN）を探し、選んだ候補の詳細は #5 の `BookLookupProvider`（openBD）から取得して記録フォーム（`/record/new`）の初期値にする。
将来 API を切り替えても、変更が「新しい実装クラス」と「Provider を登録する 1 か所」で済むよう、検索は #5 と同様にアプリ共通のインターフェース `BookSearchProvider` の背後に置く。NDL 固有の URL・クエリ・XML・エラーは実装クラスとその配下のモジュールの外に出さない。依存: #5（実装済み。`BookLookupProvider`、`bookInfoToParams`、`isbnOnlyParams`、`/record/new` の params → 初期値）。

## スコープ

### やること
- 候補の共通型 `BookCandidate`、検索結果型 `BookSearchResult`、インターフェース `BookSearchProvider`（`search(keyword)` と `attribution`）
- NDL 実装 `NdlSearchProvider`（fetch、タイムアウト、XML 解析、`BookCandidate` への変換、エラー変換）と XML 解析モジュール
- 「タイトルで探す」画面（`/record/search`）: キーワード入力 → 検索 → 候補一覧 → 候補選択 → フォームへ
- 候補選択後、ISBN があれば `BookLookupProvider.lookupByIsbn` で詳細を取得してフォームへ。openBD で見つからない・エラーのときは候補の情報でフォームを埋める。ISBN がない候補は候補の情報で直接フォームへ
- 結果 0 件・通信エラー時のメッセージ、再試行、手入力への導線
- API 利用表記を `provider.attribution` から表示
- Provider を差し込む context / hook と、既定 Provider を登録する 1 か所
- 記録一覧に「タイトルで探して追加」ボタン

### やらないこと
- 映画・ドラマ・アニメのタイトル検索
- 検索結果のページング（先頭の最大 20 件のみ）
- 検索結果のキャッシュ、入力途中の自動検索（サジェスト）、複数 Provider の同時利用・フォールバック
- 出版年のフォーム入力欄への反映（記録フォームに出版年の項目がないため。候補一覧の表示のみ）

## 受け入れ条件

### XML 解析（`lib/bookSearch/ndl/parseNdlResponse.ts`。文字列を入れて検証する純粋関数）
- [ ] 候補が複数ある RSS を、`item` の順序のまま `BookCandidate[]` に変換する（タイトル・著者・出版社・出版年・ISBN）
- [ ] 候補が 1 件のみ（`item` が配列にならないケース）でも 1 件の配列になる
- [ ] 候補が 0 件（`item` なし）のとき空配列になる
- [ ] ISBN がない候補は `isbn: null`。ISBN-10 やハイフン付きで返ってきた場合も `toIsbn13` で ISBN-13 に正規化し、無効な値は `null`。`dc:identifier` が複数あるときは ISBN 型（`xsi:type="dcndl:ISBN"`）のものを使う
- [ ] 著者・出版社・出版年が欠落・空のとき `null`。出版年は `dc:date` / `pubDate` 等から 4 桁の西暦を取り出し、取れなければ `null`
- [ ] `title` が欠落・空の `item` は候補から除外する
- [ ] 不正な XML（閉じタグ不整合、空文字、HTML など RSS でない文書）のとき解析エラー（`NdlParseError`）を投げる

### 検索の取得（`NdlSearchProvider`。`fetchFn` をモック）
- [ ] キーワードの前後空白を除去し、`https://ndlsearch.ndl.go.jp/api/opensearch` に `title=<URL エンコードしたキーワード>`・`cnt=20`・`mediatype=1`（図書）を付けた URL を GET する
- [ ] 成功時、`{ status: 'ok', candidates }`（0 件でも `ok` で空配列）を返す
- [ ] HTTP エラー（`ok: false`）、fetch の reject、タイムアウト（10 秒）のとき `{ status: 'error', reason: 'network' }` を返す（例外は投げない）
- [ ] 不正な XML のとき `{ status: 'error', reason: 'invalid_response' }` を返す
- [ ] `attribution` が「国立国会図書館サーチ API を利用しています」である
- [ ] 画面・hook・共通型のファイルに NDL の URL・型名・文言（「国立国会図書館」「NDL」）が含まれない

### 「タイトルで探す」画面（偽 `BookSearchProvider` / 偽 `BookLookupProvider` を差し込んでテスト）
- [ ] キーワード入力欄・「検索」ボタンがある。`provider.attribution` の文言が常時表示される
- [ ] 入力中（`onChangeText`）は Provider を呼ばない。「検索」ボタン押下、またはキーボードの確定（`onSubmitEditing`）で 1 回だけ `search(keyword)` が呼ばれる
- [ ] 空白だけ・空のキーワードでは Provider を呼ばず、「キーワードを入力してください」を表示する
- [ ] 検索中はローディング表示になり、検索ボタンは無効化される。連打・確定の重ね押しでも Provider は 1 回しか呼ばれない
- [ ] 結果があるとき、候補を「タイトル・著者・出版社・出版年」付きで一覧表示する（null の項目は表示しない）
- [ ] 結果 0 件のとき「見つかりませんでした」と、強調された「手入力で続ける」を表示する
- [ ] エラー時（`network` / `invalid_response` とも）「検索できませんでした。通信状況を確認してください」と「再試行」を表示し、「再試行」で同じキーワードで再検索される。「手入力で続ける」でも遷移できる
- [ ] キーワードを編集すると、結果・エラー表示は消える
- [ ] ISBN あり候補を選ぶと、`BookLookupProvider.lookupByIsbn(candidate.isbn)` が 1 回呼ばれ、found なら `router.replace` で `/record/new` に `bookInfoToParams(book)` の params を渡して遷移する（openBD の情報を優先）
- [ ] 詳細取得中は他の候補を押せない（二重実行しない）。ローディング表示が出る
- [ ] openBD が `not_found` または `error` のとき、候補の情報（`kind=book`・`title`・`creator`・`publisher`・`isbn`）でフォームに遷移する（画面にエラーは出さず、そのまま進む）
- [ ] ISBN なしの候補を選ぶと `lookupByIsbn` を呼ばず、候補の情報（`isbn` なし）でフォームに遷移する
- [ ] 「手入力で続ける」（常時表示）で、`kind=book` と入力済みキーワードをタイトルとして `/record/new` に遷移する（キーワードが空なら `kind=book` のみ）
- [ ] アンマウント後に返った結果は無視する（遷移・state 更新をしない）

### フォームへの反映
- [ ] 候補由来の params を受けた `/record/new` のフォームに、種別「本」・タイトル・作者・出版社・ISBN が入力済みで表示される（ルート経由のテスト。#5 と同じ仕組みで、openBD 由来 params と同じ形）

### 導線・構成
- [ ] 記録一覧に「タイトルで探して追加」ボタンがあり、押すと `/record/search` に遷移する（既存の「追加」「ISBN で探して追加」「バーコードで読み取って追加」は従来どおり）
- [ ] 既定の `BookSearchProvider` の登録は 1 か所（`lib/bookSearch/index.ts` の `createDefaultBookSearchProvider`）だけ
- [ ] NDL サーチの URL・クエリ・XML 要素名・解析は `lib/bookSearch/ndl/` の外にない

## 画面・振る舞い

### 記録一覧
「バーコードで読み取って追加」の下に「タイトルで探して追加」ボタン → `router.push('/record/search')`。

### タイトルで探す（`/record/search`、スタック画面、ヘッダ「タイトルで探す」）
上から: 説明文「本・漫画のタイトルを入力してください」、キーワード入力欄（`accessibilityLabel="タイトルのキーワード"`、`returnKeyType="search"`）、「検索」ボタン、利用表記（`provider.attribution`、小さな補足文字）、結果領域、「手入力で続ける」リンクボタン。

状態（検索）: `idle` → `searching` → `results`（候補あり）/ `empty` / `error`、加えて `invalid`（キーワード空）。
- `invalid`: 入力欄の下に赤字。Provider は呼ばない
- `searching`: ボタンに `ActivityIndicator`、ボタンと入力欄を無効化。実行中フラグ（ref）でも二重実行を防ぐ
- `results`: `FlatList`（最大 20 件）。各行はタイトル（主）・「著者 / 出版社 / 出版年」（従。存在する項目を ` / ` で連結）。行は `accessibilityRole="button"`
- `empty`: 「見つかりませんでした」＋「手入力で続ける」を強調
- `error`: エラー文＋「再試行」＋「手入力で続ける」
- 候補選択後は `resolving`（詳細取得中）。リスト全体を操作不可にしローディング表示。完了で `router.replace('/record/new', params)`（`replace` の理由は #5 と同じ）
- 検索中の結果・エラーはキーワード編集で `idle` に戻る（`searching` / `resolving` 中は上書きしない）
- アンマウント後の結果は無視（`active` フラグ）

## 設計

### 追加・変更するファイル（すべて `app/` 配下）

| ファイル | 内容 |
|---|---|
| `src/types/bookSearch.ts` | `BookCandidate = { title: string; author: string \| null; publisher: string \| null; publishedYear: string \| null; isbn: string \| null }`、`BookSearchError = 'network' \| 'invalid_response'`、`BookSearchResult = { status: 'ok'; candidates: BookCandidate[] } \| { status: 'error'; reason: BookSearchError }` |
| `src/lib/bookSearch/BookSearchProvider.ts` | `interface BookSearchProvider { readonly attribution: string; search(keyword: string): Promise<BookSearchResult> }` |
| `src/lib/bookSearch/ndl/NdlSearchProvider.ts` | `class NdlSearchProvider implements BookSearchProvider`。コンストラクタで `fetchFn`・`timeoutMs`（既定 10000）を受ける（`OpenBdProvider` と同形）。URL 組み立て、`AbortController` によるタイムアウト、エラー → `BookSearchError` への変換 |
| `src/lib/bookSearch/ndl/parseNdlResponse.ts` | `parseNdlResponse(xml: string): BookCandidate[]`、`class NdlParseError`。`fast-xml-parser` で解析し、`unknown` を型ガードで絞り込む（`any` 不使用）。NDL の要素名はここに閉じる |
| `src/lib/bookSearch/index.ts` | `createDefaultBookSearchProvider(): BookSearchProvider`（現状 `new NdlSearchProvider()`）。**Provider 登録の唯一の場所** |
| `src/hooks/useBookSearch.tsx` | `BookSearchContextProvider`（prop `provider?`）と `useBookSearch(): BookSearchProvider`。`useBookLookup` と同じ作り |
| `src/lib/candidateParams.ts` | `candidateToParams(candidate): Record<string,string>`（`kind: 'book'`、null は省略。`author → creator`）、`titleOnlyParams(keyword)`。`/record/new` の params 形式を既存の `isbnLookupParams.ts` と同じ流儀でまとめる |
| `src/screens/TitleSearchScreen.tsx` | 上記画面。`useBookSearch()` / `useBookLookup()` / `router.replace` を使用 |
| `src/app/record/search.tsx` | 薄いルート（default export は Expo Router の例外。既存ルートと同じ） |
| `src/app/_layout.tsx`（変更） | `BookSearchContextProvider` を追加。Stack に `record/search`（ヘッダ「タイトルで探す」）を追加 |
| `src/screens/RecordsScreen.tsx`（変更） | 「タイトルで探して追加」ボタン |
| `src/lib/isbnLookupParams.ts`（変更なし） | `bookInfoToParams` はそのまま再利用 |

### NDL サーチ API の使い方（実装クラス内に閉じる）
- `GET https://ndlsearch.ndl.go.jp/api/opensearch?title=<kw>&cnt=20&mediatype=1`。応答は RSS 2.0（`channel/item`）で、`title` / `author` / `dc:publisher` / `dc:date`（または `pubDate`）/ `dc:identifier xsi:type="dcndl:ISBN"` を使う。実装時に実レスポンスの形をドキュメント（https://ndlsearch.ndl.go.jp/help/api/specifications）で確認し、テストのフィクスチャに反映する
- `item` が 1 件だけのとき、解析結果はオブジェクトになる（配列でない）。`isArray` オプションまたは正規化関数で必ず配列に揃える
- `author` は NDL では `著者名 著` のような表記や姓名間の空白を含むことがある。**加工せず、前後空白の除去のみ**行う（過剰な整形は誤りの元）
- 並列リクエストを避ける要件は、画面側の実行中フラグ（`searching`/`resolving` 中は新規リクエストなし）で満たす

### 状態管理・データ
- 画面内の `useState`（キーワード・状態・候補）のみ。永続化なし。画面間は route params（文字列）。ライブラリの状態管理は追加しない。

### 追加する依存
- **`fast-xml-parser`**（MIT、純 JavaScript。React Native / Hermes で動作し、ネイティブモジュール不要）
  - 理由: NDL サーチの応答は XML のみ。名前空間付き要素（`dc:`・`dcndl:`）、属性（`xsi:type`）、1 件のみ/複数件の揺れ、不正 XML の検出（`XMLValidator`）を正しく扱うには実績のあるパーサが必要
  - 代替案: ① 正規表現による自前解析（不正 XML・属性・エンティティの扱いが壊れやすく、「不正な XML」の要件を満たしにくい）② `DOMParser`（React Native に標準では存在しない）③ `react-native-xml2js` / `xml2js`（Node 依存が強く、RN で polyfill が必要）④ `@xmldom/xmldom`（動作はするが、DOM 走査のコードが冗長）
- 追加は実装工程で `npx expo install fast-xml-parser`（Expo の互換表にない場合は最新安定版）で行い、`dependencies` チェックのライセンス許可リスト・脆弱性チェックを確認する。許可リストに通らない場合は自前の最小パーサではなく、判断ログに記録して代替案④へ切り替える

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| XML 解析（複数・1 件・0 件・ISBN なし/ISBN-10/複数 identifier・欠落項目・title なし・不正 XML） | `src/lib/bookSearch/ndl/__tests__/parseNdlResponse.test.ts`（XML 文字列のフィクスチャ） |
| NdlSearchProvider（URL・エンコード・`cnt`/`mediatype`・ok・0 件・HTTP エラー・reject・タイムアウト（`jest.useFakeTimers` + abort に反応する偽 fetch）・不正 XML・`attribution`） | `src/lib/bookSearch/ndl/__tests__/NdlSearchProvider.test.ts`（`fetchFn` 注入） |
| params 変換 | `src/lib/__tests__/candidateParams.test.ts` |
| 画面（入力中は呼ばない、検索ボタン・確定、空キーワード、ローディング・二重実行防止、一覧表示、0 件、エラー→再試行、編集で消去、ISBN あり→openBD found / not_found / error、ISBN なし、手入力で続ける、attribution 表示、アンマウント後） | `src/screens/__tests__/TitleSearchScreen.test.tsx`（偽 Provider を各 Context Provider で注入、`expo-router` は `jest.mock`） |
| 一覧のボタン導線 | `src/screens/__tests__/RecordsScreen.test.tsx` に追加 |
| フォームへの反映 | `src/__tests__/tabs.test.tsx` に統合ケース（`renderRouter`、偽 Provider、インメモリ Repository）。難しい場合は `candidateToParams` + `paramsToInitialValues` のテストで代替し、判断ログに記録 |
| 構成（NDL 固有の文言が共通ファイルにない） | 画面テストが偽 Provider の `attribution` 文字列だけで通ることで確認 |

差分カバレッジ 80% のため、パーサ・Provider・画面の分岐は網羅する。jest・eslint・tsconfig・CI 設定は変更しない。

## 判断ログ

1. **検索は独立した画面 `/record/search` とし、`router.replace('/record/new', params)` で記録フォームに進める**（#5 の判断 1 と同じ方針）。却下: `/record/isbn` 画面にタイトル検索を同居させる（入力の種類が違い、状態遷移が混ざる）。却下: フォーム内に検索欄を埋め込む（フォームが肥大化する）。
2. **導線は一覧に別ボタン「タイトルで探して追加」を置く**（#5・#6 と同じ並べ方）。却下: 「追加」の選択シート化（入口が増えた段階の整理は別 Issue。#5 の判断 2 参照）。
3. **インターフェース `BookSearchProvider` は `attribution`（利用表記）と `search(keyword)` を持ち、戻り値は判別共用体 `BookSearchResult`**。#5 の `BookLookupResult` と同じく、例外ではなく結果型にして分岐漏れを型で防ぐ。エラーは `network` / `invalid_response` の共通種別に変換。画面は両者を同じメッセージで扱うが、型としては区別して将来の出し分けに備える。却下: 例外（画面で種別判別が必要）。
4. **`BookCandidate` に `publishedYear: string | null`（文字列）を持たせる**。NDL の日付は「2019.5」「c2019」など揺れがあり、数値化しても使い道がない（表示のみ）ため、4 桁の西暦を文字列で抽出する。却下: `number`（欠落・揺れの扱いが増えるだけ）。
5. **候補選択後の詳細取得は #5 の `useBookLookup()`（`BookLookupProvider`）を使う**。openBD を直接呼ばない（Issue の要件）。openBD が `not_found` / `error` のときは、画面にエラーを出さず候補の情報でフォームに進む（Issue「NDL サーチの情報でフォームを埋める」）。エラーで止めると、ユーザーが手入力に戻る手間が増え、候補の情報も失われるため。却下: エラー表示して再試行させる（候補情報で十分にフォームが埋まる）。
6. **openBD が found のとき、書名・著者などは openBD の情報を優先し、NDL の情報で補完はしない**。2 つの情報源を項目単位でマージすると、表記の揺れで不整合（タイトルは openBD、著者は NDL 等）が起きやすい。却下: 項目ごとのマージ。
7. **「検索」ボタンとキーボード確定（`onSubmitEditing`）で実行し、入力のたびには呼ばない。`searching` / `resolving` 中は新規リクエストを出さない**（NDL サーチの「並列リクエストを避ける」要件。ref で二重実行を防ぐ）。デバウンス付きの自動検索は却下（Issue の指定と、API への負荷配慮）。
8. **検索条件は `title=<kw>`、`cnt=20`、`mediatype=1`（図書）**。Issue の「先頭の最大 20 件程度」と「映画等は対象外」に対応。漫画も NDL では図書に含まれる。`any=`（全項目検索）は却下（タイトル検索の Issue の主旨と、ノイズ増加のため）。
9. **XML 解析は `fast-xml-parser` を追加**（上記「追加する依存」参照。名前・理由・代替案を記載）。HTTP は #5 と同じく標準 `fetch`、タイムアウトは `AbortController` で 10 秒（#5 の判断 6 と同じ値）。
10. **ISBN は `toIsbn13` で正規化し、無効なものは `null` 扱い（候補は残す）**。無効な ISBN で openBD を引いても見つからないだけで、候補のタイトル等は有用なため。`toIsbn13` は #5 の `lib/isbn.ts` を再利用（NDL 固有ではないのでパーサの中から共通関数を呼んでよい）。
11. **「手入力で続ける」はキーワードをタイトルとして引き継ぐ**（Issue: 結果 0 件で手入力への導線）。キーワードは探したい本のタイトルである可能性が高く、再入力の手間を減らせる。却下: 何も引き継がない（#5 の判断 8 は ISBN を引き継ぐ方針で、同趣旨）。
12. **NDL の著者表記は加工しない**。表記ルールの整形は誤りの元で、ユーザーがフォームで修正できるため。
13. **出版年はフォームに渡さない**（記録フォームに項目がない）。一覧の候補選択時の判断材料としてのみ表示。
14. **画面の文言は推測で決定**: 「本・漫画のタイトルを入力してください」「検索」「キーワードを入力してください」「見つかりませんでした」「検索できませんでした。通信状況を確認してください」「再試行」「手入力で続ける」。利用表記は Provider 側（NDL 実装は「国立国会図書館サーチ API を利用しています」）。
15. **CLAUDE.md・jest 設定・CI 設定の変更は不要と判断**。`fast-xml-parser` がライセンス許可リストに無い場合のみ、`orchestrator/policy.json` 等の変更が必要になる可能性があるため、その場合は実装工程で判断ログに提案として書く。
