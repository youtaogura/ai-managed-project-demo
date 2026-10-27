# Issue #108 タイトルで探すで結果が出ない

## 背景・目的

「タイトルで探す」で、どんなキーワードでも結果が 1 件も出ない。バーコードがない本や ISBN がわからない本を追加する入口なので、動くようにする。

### 調査結果（2026-10-27、実際の API を curl で確認）

- **原因（確定）**: `NdlSearchProvider` が付けている `mediatype=1` が、今の NDL サーチ OpenSearch（`https://ndlsearch.ndl.go.jp/api/opensearch`）では**どんなキーワードでも `totalResults=0`** を返す。`mediatype=1`〜`7`、`mediatype=本`、`mediatype=books`、`dpid=iss-ndl-opac&mediatype=1` も 0 件か無効。HTTP は 200 で XML も正しいので、アプリ側は「0 件 = 見つかりませんでした」と表示している。エラーにならないので気づきにくかった。
  - `title=ノルウェイの森&cnt=3` → `mediatype` なしは 534 件、`mediatype=1` は 0 件。
- `mediatype` を外すと件数は出るが、雑誌記事（`<category>記事</category>`）が先に並び、本がほとんど出ない。`dpid=iss-ndl-opac`（NDL 蔵書）を付けると 132 件になり、`<category>図書</category>` が混ざる（`録音資料`、`博士論文` なども混ざる）。実装担当が最適な絞り方を確認する（設計参照）。
- XML の形（確認済み）: 図書の item は `title` `author` `category`（`図書` / `紙`）`dc:publisher` `dc:date`（`xsi:type="dcterms:W3CDTF"`）`dc:identifier xsi:type="dcndl:ISBN"`（ハイフン付き 978-4-88065-402-7）`dc:identifier xsi:type="dcndl:NDLBibID"` を持つ。`parseNdlResponse.ts` の要素名・配列指定・`@_xsi:type` の読み取りはこの形と合っており、パース側に致命的な問題は見つかっていない。ただし `author` は `宮脇, 俊文, 1953-,宮脇俊文 編` のように重複・生年付きで返る。`dc:creator` のほうが素直。
- 画面側（`TitleSearchScreen` / `useBookSearch`）は、結果を受け取ってから `candidates` を表示するまでに落としている箇所は見当たらない（0 件のときだけ `empty`）。
- **Web（CORS）**: レスポンスヘッダーに `Access-Control-Allow-Origin` がない。ブラウザ（Expo Web）からの直接呼び出しはブロックされる見込み。ネイティブ（iOS/Android）は影響しない。アプリは iOS/Android 向け（EAS Build）なので Web は対象外とし、判断ログに記録する。
- **レート制限**: 連続アクセスで `429 Too Many Requests`（`<error>` の XML、HTTP 200 のことがある）が返る。現状は `<error>` を `parseNdlResponse` が「RSS ではありません」で例外にするので `invalid_response` → 「検索できませんでした」になる。これは今までどおりで問題ない。

## スコープ

やること:
- `NdlSearchProvider` のリクエストを、本の候補が先に出るものに直す。
- 候補が本（`図書`）に絞られるようにする（API パラメータ、または応答の `category` でクライアント側のフィルタ。設計参照）。
- 実際の応答をもとにしたテスト用 XML（数件）で、パースと画面表示をテストする。
- 作者を `dc:creator` 優先で取り出す（重複・表記ゆれの対策）。

やらないこと:
- 取得元の変更（国立国会図書館サーチのまま）。
- Web 対応（CORS 回避のプロキシなど）。
- 画面のデザイン変更、`useBookSearch` の API 変更。

## 受け入れ条件

- [ ] 検索リクエストの URL に `mediatype` が含まれない（Jest: `NdlSearchProvider.test.ts` で URL を検証）。
- [ ] 実際の応答の形にしたテスト用 XML で、候補のタイトル・作者・出版社・年・ISBN（ハイフン付きでも ISBN-13 に正規化）・NDL ID が正しく取り出される（Jest: `parseNdlResponse.test.ts`）。
- [ ] 図書（`category` に `図書`）以外の item（記事・録音資料・博士論文など）が混ざる応答でも、候補には図書だけが残る（Jest）。図書が 0 件なら `empty` と同じ扱い（候補 0 件）。
- [ ] `dc:creator` があるときは作者に使い、重複しない。なければ `author` の先頭の人物を使う（Jest）。
- [ ] 検索結果が返ると、`TitleSearchScreen` に候補が表示される（実際の応答の形のテスト用 XML を通した Provider を差し込む。Jest: `TitleSearchScreen.test.tsx`）。
- [ ] 結果が 0 件のとき「見つかりませんでした」、通信失敗・HTTP エラー・`<error>` 応答のとき「検索できませんでした。通信状況を確認してください」が今までどおり表示される（Jest）。
- [ ] 実際の API で「ノルウェイの森」「ONE PIECE」「サピエンス全史」を検索し、本の候補が出ることを確認して PR に書く（手動。429 のときは間隔を空けて再実施）。
- [ ] 原因と直し方を PR の判断ログに書く。

## 画面・振る舞い

画面は変更しない。状態遷移は現状どおり（`idle → searching → results | empty | error`）。変更はデータ取得層だけ。

## 設計

変更するファイル:
- `app/src/lib/bookSearch/ndl/NdlSearchProvider.ts`: `mediatype` を削除。
  - 実装担当は**実際の API で次を比較して**決める（連続アクセスは 429 になるので 5 秒以上あける）: (a) `dpid=iss-ndl-opac` を付ける、(b) 付けない。3 つのキーワードで、先頭 `cnt` 件の中の図書の数が多いほうを選ぶ。図書が少なければ `cnt` を増やす（上限 100 が目安。多すぎるとレスポンスが重いので 50 程度まで）。他に本に絞れるパラメータが見つかればそれを使う。
  - API パラメータだけで本に絞れない場合は、次の `parseNdlResponse` のフィルタで絞る。
- `app/src/lib/bookSearch/ndl/parseNdlResponse.ts`:
  - `category` を配列で読む（`isArray` に `category` を追加）。`category` を持つ item で `図書` を含まないものは除外する。`category` がない item（古い形・テスト）は除外しない。
  - 作者は `dc:creator`（`isArray` に追加）の先頭 → なければ `author` をカンマ区切りで先頭の人物（`, ` 区切りの姓名は壊さない点に注意。迷うなら `author` のまま）。`dc:creator` の `xsi:type` などの属性は `#text` で読む。
  - `<error>` 応答は今までどおり例外（`invalid_response`）。
- テスト: `__tests__/parseNdlResponse.test.ts`、`NdlSearchProvider.test.ts` を更新。テスト用 XML は上の調査結果で確認した実応答（図書・記事・録音資料の混在）の形にする。`TitleSearchScreen` のテストは既存ファイルに、実応答形 XML を通す `NdlSearchProvider`（`fetchFn` を差し替え）を使うケースを追加。
- 新しいライブラリは追加しない。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| URL に `mediatype` なし | `NdlSearchProvider.test.ts` |
| 候補の各項目、ISBN 正規化 | `parseNdlResponse.test.ts` |
| 図書以外の除外、0 件 | `parseNdlResponse.test.ts` |
| 作者の取り出し | `parseNdlResponse.test.ts` |
| 画面に候補が表示される | `TitleSearchScreen.test.tsx`（`fetchFn` 差し替え） |
| 0 件・失敗時の表示 | 既存の `TitleSearchScreen.test.tsx` と `NdlSearchProvider.test.ts` を維持 |
| 実 API で 3 キーワード | 手動。結果を PR 本文に記載 |

## 判断ログ

- **原因の扱い**: アプリのコードやテストが通っていたのは、テストが `mediatype=1` を前提にしたモック応答だったため。実 API の仕様変更（`mediatype` が全件 0 件になる）に追従できていなかった。却下: 画面側の修正（画面は問題なし）。
- **絞り込みの方法**: API で絞れる保証がないので、API パラメータ（`dpid`）とクライアント側の `category` フィルタの併用を選ぶ。却下: `mediatype` の別の値を探し続ける（1〜7・文字列を試して全部 0 件）。却下: 絞り込みなし（記事が先頭に並び、本が埋もれる）。
- **取得元**: 国立国会図書館サーチのまま。応答の形は図書では ISBN・出版社・年が揃っており、変える必要がない。
- **Web（CORS）**: `Access-Control-Allow-Origin` がなくブラウザからは失敗する見込み。アプリは iOS/Android 向けで Web は配布しないため対象外。必要になったら別 Issue でプロキシを検討する。
- **429**: 実 API の動作確認は連続アクセスで 429 になるので、間隔を空ける。アプリ側のリトライは追加しない（既存の「再試行」ボタンで足りる）。
- **作者**: `author` は重複・生年付きになるため `dc:creator` を優先。却下: `author` をそのまま使う（`宮脇, 俊文, 1953-,宮脇俊文 編` のように画面に出る）。
