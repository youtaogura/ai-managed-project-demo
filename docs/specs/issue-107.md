# Issue #107 実際の画面を撮影してデザインと見比べられるようにし、食い違いを直す

## 背景・目的

書斎のデザインで作り直した画面（#85〜#93）が、`docs/design-system/screens/*.png` と細かいところで違っている。各 PR に「撮影ツールが使えないため、画像との見比べはしていない」とあり、エージェントが実際の画面を見られていないのが原因。
Chromium・日本語フォントは入った（#111、`CHROMIUM_PATH=/usr/bin/chromium`）。これを使って Web 版を撮影する仕組みを作り、今の画面の食い違いを直し、以後の Issue でも使えるようにする。

## スコープ

### やること
1. 撮影の仕組み（`app/scripts/screenshots/`）
   - `expo export --platform web`（`app.json` は `web.output: "static"`）の出力 `app/dist` を Node の HTTP サーバーで配信する。`/x` は `x.html`、なければ `x/index.html`、なければ `index.html` に解決する。動的ルート `/reading/<id>` は静的書き出しでは `reading/[id].html` になるため、それも解決する
   - Playwright（Chromium）で幅 390px・高さ 844px・`deviceScaleFactor: 2`、`locale: 'ja-JP'` で撮影
   - テスト用データは、ページ読み込み前に `context.addInitScript` で `localStorage` に入れる。Web の AsyncStorage は `localStorage` なので、**アプリのコードは変えない**（撮影用の分岐を入れない）。キーは `records.v1` / `shelves.v1` / `starterSettings.v1`。スクリプトから `src/` の定数を import しにくければ文字列を複製し、アプリ側の定数と一致することをテストで確かめる
   - 撮影する画面の一覧（シーン）と、シーンごとのデータ・遷移先・必要な操作（シートを開くためのタップなど）は `scenes.mjs` に宣言的に書く
   - 出力先は `app/.screenshots/`（`app/.gitignore` に追加して git で無視）。ファイル名は `docs/design-system/screens/` の画像と同じ名前（`shelf.png` など）にして、見比べやすくする
   - `pnpm shots`（1コマンド）で「export → 配信 → 撮影」まで行う。`pnpm shots -- shelf reading` のように画面名で絞れる。ブラウザは `chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })`。`playwright install` はしない
2. 撮影して `docs/design-system/screens/*.png` と見比べ、食い違いを直す
   - 対象: 本棚、本棚（本がない）、本棚を作る、本棚を選ぶ、本を追加、タイトルで探す、本を登録・編集、読んでる本、メモ・引用を書く、読み終えた、書き出しの続きを書く、読み返す、振り返り、設定、書き出しの管理
   - 色・余白・角丸・文字は画像から読み取らず、`design/tokens.ts` のトークンで直す。画像と `docs/design-system/components/<部品>/README.md` が食い違うときは部品の README を優先
   - デザインシステムにない色・部品が必要に見えるときは作らず、判断ログに提案として書く
3. `app/AGENTS.md` に撮影の手順を追記（UI を変えたら `pnpm shots` で撮り、画像と見比べ、PR に「どの画面を撮って、何を直したか」を書く）

### やらないこと
- `tokens.ts` / `docs/design-system/` / `docker/` / CI の変更（人間の作業）
- 撮影のための本番コードの分岐。`testID` の追加を前提にした作りにもしない（文言・ロールで要素を選ぶ）
- バーコード画面（`scan.png`）の撮影。Web にカメラがなく画像と比べられないため対象外（理由は判断ログ）
- CI への撮影ジョブの追加。撮影画像のコミット

## 受け入れ条件

- [ ] `pnpm shots` 1コマンドで、対象の画面（バーコードを除く14画面）の PNG が `app/.screenshots/` に書き出される（手元で実行して確認し、PR 本文に書く）
- [ ] 撮影の補助ロジックのテスト（Jest）:
  - [ ] 配信のパス解決（`/` → `index.html`、`/settings` → `settings.html`、`/reading/abc` → `reading/[id].html`、存在しないパス → `index.html`、`..` を含むパスはディレクトリ外を読まない）
  - [ ] シーン定義: 全シーンの名前が重複しない、`docs/design-system/screens/` の画像（`scan.png` を除く）すべてに対応するシーンがある、各シーンのシードデータがアプリの読み込み（`recordMigration` / `recordGuard`）を通る
  - [ ] ストレージのキーがアプリ側の定数と一致する
  - [ ] 画面名の絞り込み引数の解釈（指定なし = 全部、未知の名前はエラー）
- [ ] `app/.screenshots/` が git で無視される
- [ ] 撮影して見つけた食い違いを直し、直した画面のテスト（表示される要素・文言・出し分け）が通る。直すたびに該当画面のテストを追加・更新する
- [ ] PR 本文に、各画面について「直したところ」と「残した違い（理由）」の一覧がある（比べた結果は文章で書く）
- [ ] `app/AGENTS.md` に撮影手順が書かれている
- [ ] 本番のアプリのコード（`src/`）に、撮影のためだけの分岐が入っていない
- [ ] `pnpm check` が通る

## 画面・振る舞い（撮影シーン）

| 名前（= 画像名） | 画面 | データ | 到達方法 |
|---|---|---|---|
| shelf | 本棚 | 本が8冊前後（読んでる・読み終えた・読みたい・途中でやめた、お気に入り、表紙画像なしで背表紙）、本棚2つ | `/` |
| shelf-empty | 本棚（本がない） | 本・本棚なし | `/` |
| shelf-new | 本棚を作る | shelf と同じ | 本棚の「＋」をタップ |
| shelf-pick | 本棚を選ぶ | shelf と同じ | 本棚の名前（切り替え）をタップ |
| add-sheet | 本を追加 | shelf と同じ | 追加ボタンをタップ |
| title-search | タイトルで探す | なし | `/record/search`。検索結果は外部 API が必要なので撮らず、入力欄の状態を撮る |
| book-form | 本を登録・編集 | 編集で開く本1冊 | `/record/<id>` |
| reading | 読んでる本 | 読んでる本1冊（ひとこと、書き出し、メモ、引用あり） | `/reading/<id>` |
| note-sheet | メモ・引用を書く | reading と同じ | 「メモ・引用を書く」をタップ |
| finished | 読み終えた | 読み終えた本1冊 | `/finished/<id>` |
| write | 書き出しの続きを書く | 書き出しを書いた本1冊 | `/write/<id>` |
| reread | 読み返す | 読み終えた本1冊（書き出し、続き、引用、メモ） | `/records/<id>` |
| review | 振り返り | 今年読み終えた本が数冊（お気に入り含む） | `/analytics` |
| settings | 設定 | shelf と同じ | `/settings` |
| starters | 書き出しの管理 | 既定の設定 | `/starters` |

各シーンは「ストレージに入れるデータ」「開く URL」「（任意）撮影前の操作（文言またはロールで要素を選んでクリック）」「撮影前に待つ表示（文言）」を持つ。待つ表示が出ないシーンは名前つきのエラーで失敗させ、他のシーンの撮影は続ける（最後に失敗一覧を出し、終了コードは非0）。

撮影時はフォント読み込み完了（`document.fonts.ready`）とスプラッシュが消えるのを待つ。シートのせり上がりのアニメーションが止まるのを待つため、操作後に短い待ち（300ms 程度）を入れる。

## 設計

### 追加・変更するファイル（すべて `app/` 配下）
- `scripts/screenshots/index.mjs` … エントリ。引数解釈 → `expo export --platform web` → サーバー起動 → 各シーン撮影 → 後片付け
- `scripts/screenshots/server.mjs` … `resolveRequestPath(distDir, urlPath)` と `createStaticServer(distDir)`
- `scripts/screenshots/scenes.mjs` … シーン定義（`SCENES`）と `parseSceneArgs(argv)`
- `scripts/screenshots/seed.mjs` … シード用のデータ生成（`makeRecord(overrides)` など。`MediaRecord` の全フィールドを埋める）
- `scripts/screenshots/__tests__/*.test.ts` … 上記のテスト（`.mjs` を import）。Jest の `collectCoverageFrom` は `src/` のみ
- `app/.gitignore` に `.screenshots/`
- `app/AGENTS.md` に撮影手順
- `package.json` に scripts `"shots": "node scripts/screenshots/index.mjs"`

`src/` 側の変更は、撮影で見つけた食い違いの修正だけ（画面コンポーネントとそのテスト）。差分カバレッジは `src/` の変更行をテストで通すことで満たす。

### 依存
- **`playwright-core`**（devDependencies。`pnpm add -D playwright-core`）
  - 理由: Chromium を `executablePath` で渡して操作するのに必要。ブラウザ本体は同梱・ダウンロードしないので `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` の環境と相性がよい
  - 代替案: `playwright`（ブラウザのダウンロード用スクリプトが付く）→ 却下。`puppeteer-core`（Issue とイメージの前提が Playwright）→ 却下
  - ライセンス: Apache-2.0（許可リストにある）
- 静的サーバーは Node 標準の `node:http` で書く（追加の依存なし）

### 状態・データ
- シードは `localStorage` に `records.v1`（`MediaRecord[]` の JSON）、`shelves.v1`、`starterSettings.v1`。`recordMigration` を通るか確かめる
- 日付は固定。ただし振り返りは「今年」で集計するため、振り返りのシードだけ撮影時の現在の年から作る

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| パス解決 | `scripts/screenshots/__tests__/server.test.ts`（一時ディレクトリに `index.html` などを作って確かめる） |
| シーン定義の整合（重複、画像との対応、シードの読み込み、キー一致） | `scenes.test.ts` |
| 引数の解釈 | `scenes.test.ts` |
| 画面の食い違いの修正 | 該当画面の `src/screens/__tests__/*.test.tsx`、`src/components/__tests__/` を更新（表示・文言・出し分けを振る舞いで確かめる） |
| `.screenshots/` の無視、AGENTS.md | 目視（PR 本文に `git check-ignore` の結果を書く） |
| 1コマンドで撮れる | 手元で `pnpm shots` を実行し、14枚を Read ツールで開いて確認 |

Playwright を起動する部分（`index.mjs`）は Jest では実行しない。

## 判断ログ

- **撮影用データの入れ方**: Playwright の `addInitScript` で `localStorage` に入れる案を選んだ。却下案: (a) 環境変数 `EXPO_PUBLIC_*` でシードを切り替える、(b) ストアのプロバイダを差し替える撮影専用ルートを作る。どちらも本番コードに撮影用の分岐が入り、Issue の条件に反する。Web の AsyncStorage は `localStorage` なので追加のコードは要らない。
- **配信方法**: `expo export --platform web` の出力を `node:http` で配信。却下案: 静的配信パッケージの追加（依存を増やさない）、Expo の開発サーバーを使う方法（CLAUDE.md で開発サーバーの起動を禁止）。
- **Playwright のパッケージ**: `playwright-core` を選択（上記）。
- **バーコード画面（scan.png）**: Web にカメラがなく、権限の画面しか撮れないため対象外。Issue の「撮影の対象から外すか、代わりの表示で撮る」のうち前者。
- **タイトルで探す**: 外部 API に依存するため結果の表示は撮らず、入力欄の状態のみ。`page.route` でモックする案は、結果の見た目は既存の Jest で確認済みで、撮影の目的（余白・色・書体の見比べ）には入力状態で足りるため見送り。必要になれば後から追加できる。
- **撮影スクリプトの置き場所**: `scripts/`（既存の `gen-licenses.mjs` と同じ）。`src/` に置くとアプリのバンドルとカバレッジの対象になるため。
- **食い違いの直し方の優先順位**: 画像と部品の README が食い違うときは README を優先（Issue の指示）。トークンにない値が必要なときは作らず、PR 本文の判断ログに提案（トークン名案・値・使う場所）として書く。
- **撮影画像の添付**: `.screenshots/` は git 無視のため PR にはコミットしない。比べた結果を文章で書く（Issue が許可している）。
- **進め方（実装担当へ）**: まず仕組みを作って全画面を撮る → 画面ごとに画像と見比べて食い違いの一覧を作る（PR 本文の元になる）→ 直す → 撮り直す。1画面ごとにコミットしてよい。
