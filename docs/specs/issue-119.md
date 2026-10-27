# Issue #119 見た目を直す: 本を追加・タイトルで探す

## 背景・目的

#107 の続き。本を追加するシート（`add-sheet.png`）とタイトルで探す画面（`title-search.png`）が、デザイン画像と細かいところで違わないかを見比べ、違いを直す。実装担当は `pnpm shots -- add-sheet title-search` で撮って（`app/.screenshots/`）画像と見比べ、違いを直す。画像と部品の README が食い違うときは README を優先し、色・余白・角丸・文字は `design/tokens.ts` のトークンで直す。画像の本・作者・文章（サンプル）の違いは直さない。

対象部品: `AddSheet` / `BottomSheet` / `Button` / `TextField` / `Spine` / `BookSearchRow` / `ScreenHeaderBar` / `TitleSearchScreen`。

## スコープ

### やること

1. **撮影シーンの整備（先にやる）**。`title-search` は今、入力前の空の状態しか撮れず、画像（「灯台」で5件の結果）と比べられない。
   - `scripts/screenshots/scenes.cjs` のシーンに任意の `search`（`{ keyword, results }`）を足す。`index.mjs` は、ある場合に Playwright の `page.route` で `https://ndlsearch.ndl.go.jp/api/opensearch*` に NDL OpenSearch 形式の XML（`parseNdlResponse` が読める形）を返し、入力欄にキーワードを入れて「検索」を押してから `waitFor`（`「灯台」の検索結果`）を待つ。
   - **アプリのコードに撮影用の分岐は入れない**（ネットワークの差し替えは撮影スクリプト側だけで行う）。`scenes.d.cts` の型と `scripts/screenshots/__tests__` を更新する。
   - 結果の本は画像のサンプルと同じ形（タイトル・作者・出版社・年、ISBN なし）で5件。
2. 撮影して見つけた差を直す。下は現コードを画像と見比べて当たりを付けたもの。実装担当は撮影で確かめ、下に無い差も Issue の「確認する項目」を1つずつ見て、見つけたら直す。

| 画面 | 項目 | 今のコード | 直す方向 |
|---|---|---|---|
| 本を追加 | 並び・文言・主ボタン | 4行（スキャンが墨の主ボタン）で画像と同じ構成 | 撮って確かめる。違えば `AddSheet` / `BottomSheet`（ハンドル・見出し・行の高さ 64・角丸・行間）を直す |
| 本を追加 | アイコン | 行に「›」のみ | 画像も「›」のみ。**アイコンは足さない**（一致のはず） |
| タイトルで探す | 検索欄 | 枠 `line` 1px・背景 `surface2`・「⌕」あり | 画像は枠が濃く（`lineStrong` 相当）「⌕」なし、ボタンは枠なしの文字（墨・太字）。README の `TextField` を見て合わせる。`⌕` の有無は画像に合わせる |
| タイトルで探す | 閉じる | 「✕」の `icon` ボタン | 画像は「‹」。画像と README のどちらが正かを `ScreenHeaderBar` の README で確認し、他画面（`✕` を使う）に影響する場合は `onClose` のアイコンを props にせず**この画面だけ**で合わせるか、残して理由を書く |
| タイトルで探す | 件数 | `label`・`textSecondary` | 画像と比べる（余白） |
| タイトルで探す | 結果の行 | 背表紙 22×66、タイトル `reading`、詳細 `label`、区切り線 | 画像は背表紙が大きめ（幅 22 を README は指定）。幅は 22 を守り、高さ・行の余白・タイトルの太さ・「›」の色を画像に近づける。小さい背表紙でタイトルの縦書きが切れる（`Spine` の小サイズ時の組み）も確認 |
| タイトルで探す | 下のボタン・クレジット | outline ボタン、`micro` の `textTertiary` | 画像と比べる。ボタン枠の濃さ・角丸・上の区切り線 |

### やらないこと
- `tokens.ts` / `docs/design-system/` / CI の変更。要る色・文字スタイルは判断ログに提案する
- 検索のロジック・遷移・エラー時の文言の変更（見た目だけ）
- `Spine` `Button` `TextField` `BottomSheet` `ScreenHeaderBar` は他画面でも使う共通部品。直して他画面が変わるなら、その画面も撮って PR 本文に書く。変わりすぎる場合は共通部品を触らず、この画面側で合わせる
- 本棚（#117）で直した `Spine` の栞・線の位置は触らない

## 受け入れ条件

- [ ] 本を追加: 見出し「本を追加する」と、「バーコードを読み取る」「タイトルで探す」「ISBN を入力する」「手で入力する」の4つのボタン（説明文付き）が、この順に出る。それぞれ押すと対応する `onSelect` が呼ばれる（既存）
- [ ] タイトルで探す: 入力欄（ラベル「タイトルのキーワード」）と「検索」ボタンが出る。空で検索すると「キーワードを入力してください」が出る
- [ ] 検索して結果があると、「「灯台」の検索結果 N 件」と、結果ごとにタイトルと「作者 · 出版社 · 年」（無い項目は省く）が出る
- [ ] 結果の行をタップすると、これまでどおり登録画面（`/record/new`）へ遷移する
- [ ] 結果がないとき「見つかりませんでした」が出て、下のボタンが主ボタン（墨）になる。通信エラー時は「検索できませんでした…」と「再試行」が出る（既存の振る舞いを維持）
- [ ] 下に「見つからないので手で入力する」と、国立国会図書館サーチのクレジットが出る
- [ ] `pnpm shots -- title-search` で、画像と同じ「結果が5件出た状態」を撮れる（シーンの `search` 設定。`scenes.test.ts` で検査）
- [ ] 撮り直した `add-sheet` `title-search` を画像と見比べ、PR 本文に Issue の「確認する項目」の全項目について 一致 / 直した / 残した（理由）の表を書く
- [ ] `cd app && pnpm check` が通る

## 画面・振る舞い

- 本を追加シート: `BottomSheet`（ハンドル・見出し・閉じる）の中に4つの行ボタン。先頭が墨の主ボタン、ほかは `surface2` ＋ `lineStrong` の枠。各行は見出し（`button`）・説明（`label`）・右の「›」。
- タイトルで探す: 上に閉じるボタンと検索欄と「検索」、区切り線、件数、結果の行（小さな背表紙・タイトル・詳細・「›」）、下に固定の「見つからないので手で入力する」とクレジット。
- 状態（idle / searching / invalid / results / empty / error / resolving）と遷移は変えない。

## 設計

変更するファイル:
- `app/scripts/screenshots/scenes.cjs` `index.mjs` `scenes.d.cts` と `__tests__` — 検索結果シーン（上記）。NDL 形式の XML は `seed.cjs` に生成関数（例: `makeNdlSearchXml(items)`）を置く。
- `app/src/screens/TitleSearchScreen.tsx` — 検索欄・ヘッダー・フッターの見た目
- `app/src/components/BookSearchRow.tsx` — 行の余白・文字・背表紙の大きさ
- `app/src/components/AddSheet.tsx` / `BottomSheet.tsx` — 撮って差があれば
- `Button` `TextField` `Spine` `ScreenHeaderBar` — 差の原因がそこにあるときだけ、他画面への影響を確認して最小限で

状態管理・データ構造の変更なし。**依存の追加なし**（Playwright は既存の `playwright-core`）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 本を追加の見出し・4つのボタン・選択 | `components/__tests__/AddSheet.test.tsx`（既存） |
| 検索欄・検索ボタン・空入力のエラー | `screens/__tests__/TitleSearchScreen.test.tsx`（既存を更新） |
| 件数・結果の行の文言・遷移・空・エラー | 同上 |
| クレジット・手で入力するボタン | 同上 |
| 行の詳細行の出し分け | `components/__tests__/BookSearchRow.test.tsx` |
| シーンの `search` と画像名の対応 | `scripts/screenshots/__tests__` |

スタイルの数値だけを確かめるテストは足さない。変更行の差分カバレッジ 80% 以上のため、新しい分岐（シーンの `search` あり・なし、新しい props）は上のテストで通す。

## 判断ログ

- **検索結果の撮り方**: 撮影スクリプトで Playwright の `page.route` により NDL の API をテスト用 XML に差し替える。却下案: Provider を差し替えるアプリ側の分岐（Issue が禁止）、入力欄の状態だけ撮る（件数・結果の行が確かめられず、確認項目の半分が残る）。
- **アイコン**: 本を追加の行は画像も「›」のみなので足さない（Issue の「アイコン」項目は「一致」になる見込み）。
- **共通部品の扱い**: 差が共通部品にあっても、他画面を変えすぎるなら画面側で合わせる。迷ったら README を優先する。
- **「‹」と「✕」**: `ScreenHeaderBar` は他画面で「✕」を使うため、画像と README が食い違うなら README を優先し、画像の「‹」に合わせる変更は他画面に波及させない。判断は実装担当が撮影後に PR 本文へ書く。
- **新しい色・文字スタイル**: 作らない。要る場合はここに提案として追記する。
