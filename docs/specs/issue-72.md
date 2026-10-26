# Issue #72 書影の取得元を openBD だけにする

## 背景・目的

#51 で追加した書影の取得元のうち、国立国会図書館サーチの書影 API（`NdlCoverProvider`）と Google Books（`GoogleBooksCoverProvider`）は、実 API の検証で書影を取れなかった（NDL は提供終了、Google Books は 429 / ISBN 検索で当たらない）。書影が取れないことは許容し、取得元を openBD だけにする。書影のない記録は文字の表紙（#36）と自分で撮った写真で見せる。リリース前なので後方互換（保存済みの記録・古い URL の移行）は考えない。

### 現状（コード上の事実）
- `lib/coverLookup/index.ts` の `createDefaultCoverResolver()` が `[NdlCoverProvider, GoogleBooksCoverProvider]` を `createCoverResolver` に登録する唯一の場所。`hooks/useCoverResolver.tsx` が `CoverResolverContextProvider` 経由で画面に渡す。
- 書影の自動取得は `withCover` / `needsCover`（ISBN 手入力の保存・詳細画面を開いたとき）。ISBN・バーコード・タイトル検索の追加では、openBD の書誌情報（`lib/bookLookup/OpenBdProvider.ts` の `summary.cover` → `BookInfo.coverUrl`）をそのまま使う。この経路は変えない。
- `lib/coverLookup/coverCredit.ts` の `coverCreditLabel` は Google Books / NDL の URL にだけ表記を返し、openBD の URL では `null`。`RecordDetailScreen.tsx`（180, 224 行付近）が表示する。
- 本のタイトル検索（`lib/bookSearch/ndl/` の NDL 検索 API）は書影と無関係。変えない。

## スコープ

### やること
1. `NdlCoverProvider.ts` / `GoogleBooksCoverProvider.ts` とそのテストを削除する。
2. openBD の書影取得元 `OpenBdCoverProvider`（`CoverProvider` 実装）を `lib/coverLookup/` に追加する。
3. `createDefaultCoverResolver()` の登録を `[new OpenBdCoverProvider()]` だけにする。`createCoverResolver`（複数取得元を順に試す仕組み）は残す。
4. 書影のクレジット（`coverCredit.ts`、詳細画面の表示、関連テスト）を削除する（判断ログ 1）。
5. テストを更新・追加する。

### やらないこと
- 新しい書影の取得元（楽天ブックス、Yahoo!ショッピング、Amazon など）。
- 書影が取れなかったときに撮影を促す UI。
- 保存済みの記録の移行、古い書影 URL（NDL / Google Books）の扱い。
- NDL 検索 API（タイトル検索）の変更。
- 「このアプリについて」の出典表示（#56）の変更。このリポジトリには該当する画面がまだ無い（`grep` で「出典」表示は NDL 検索の `attribution` のみ）。書影の出典は openBD だけ、という前提で #56 側が決める。

## 受け入れ条件

- [ ] `createDefaultCoverResolver()` が openBD にだけ問い合わせる（`fetch` をモックし、呼ばれた URL がすべて `api.openbd.jp` であり、`ndlsearch.ndl.go.jp` / `googleapis.com` に通信しない）。
- [ ] `OpenBdCoverProvider.findCoverUrl(isbn13, signal)` は、openBD の応答に `summary.cover` があればその URL、なければ（空文字・欠落・`[null]`・HTTP エラー・不正な JSON・通信失敗・中断）`null` を返し、例外を投げない。
- [ ] 書影がある ISBN を手入力して保存すると記録の `coverUrl` に書影 URL が入る。書影のない ISBN では `coverUrl: null` で保存され、保存は止まらない（openBD の応答をモックして画面テスト）。
- [ ] 書影のない記録を詳細画面で開くと、openBD に書影があれば `coverUrl` が保存される。なければ文字の表紙のまま。
- [ ] 詳細画面に書影のクレジット（「書影: …」）が出ない（どの `coverUrl` でも）。
- [ ] `NdlCoverProvider` / `GoogleBooksCoverProvider` / `coverCreditLabel` がコードベースに存在しない。
- [ ] 本のタイトル検索（`NdlSearchProvider`）のテストは変更なしで通る。
- [ ] `pnpm check` が通る（既存の `createCoverResolver` のテストは残る）。

## 画面・振る舞い

画面構成は変えない。違いは次の 2 点だけ。
- 書影の自動取得（ISBN 手入力の保存時、書影のない記録の詳細表示時）は openBD に 1 回問い合わせる。見つからない・失敗・タイムアウト（全体 8 秒、既存の `createCoverResolver`）のときは `null`。記録の追加・保存は止めず、文字の表紙のまま。
- 詳細画面の最下部にあった書影クレジットの行を無くす。

## 設計

### 追加
- `app/src/lib/coverLookup/OpenBdCoverProvider.ts`
  - `export class OpenBdCoverProvider implements CoverProvider`、`name = 'openbd'`。
  - 既存の `OpenBdProvider`（`BookLookupProvider`）に委譲する: `constructor(options: { lookup?: BookLookupProvider } = {})`、既定は `new OpenBdProvider()`。`findCoverUrl` は `lookupByIsbn(isbn13)` が `found` かつ `book.coverUrl !== null` のときだけ `book.coverUrl` を返し、それ以外・例外は `null`。openBD の応答の解釈（`summary.cover` の取り出し）は `OpenBdProvider` に一本化し、重複させない（判断ログ 2）。
  - `signal` は `OpenBdProvider` が受け取らないため転送しない。全体の締め切りは `createCoverResolver` の `Promise.race` が担保する。ただし、中断済みの `signal`（`signal.aborted`）なら問い合わせず `null` を返す。
  - 書影 URL が `http://` なら `https://` に置き換える（表示側の混在コンテンツ回避。既存の Google Books 実装と同じ配慮）。`https://` ならそのまま。

### 変更
- `lib/coverLookup/index.ts`: 登録を `[new OpenBdCoverProvider()]` に。コメントを「openBD だけ。取得元を足すときはここに追加する」に更新。
- `screens/RecordDetailScreen.tsx`: `coverCreditLabel` の import、`credit` 変数、クレジット表示の `AppText` を削除。これで不要になる import（`colors` など）があれば整理する。
- `lib/coverLookup/__tests__/helpers.test.ts`: `coverCreditLabel` の describe を削除（`needsCover` / `withCover` は残す）。
- `lib/coverLookup/__tests__/providers.test.ts`: NDL / Google Books のテストを削除し、`OpenBdCoverProvider` のテストに置き換える。
- `screens/__tests__/RecordDetailScreen.test.tsx`（411 行付近）: クレジットを検証している箇所を「クレジットが出ない」ことの検証に更新する（`coverUrl` が openBD・NDL・Google Books・写真・null のいずれでも `書影:` を含む文言が無い）。
- `screens/__tests__/IsbnLookupScreen.test.tsx` / `RecordFormScreen.test.tsx` など、`createDefaultCoverResolver` や NDL/Google の URL に依存するテストがあれば更新する。

### 削除
- `lib/coverLookup/NdlCoverProvider.ts`、`lib/coverLookup/GoogleBooksCoverProvider.ts`、`lib/coverLookup/coverCredit.ts`

### 状態管理・データ構造
変更なし。`MediaRecord.coverUrl` は `string | null` のまま。依存パッケージの追加なし。環境変数の追加なし（openBD はキー不要）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| openBD にだけ通信する | `coverLookup/__tests__/` に `createDefaultCoverResolver` のテストを追加。`globalThis.fetch` をモックし、呼ばれた URL の host が `api.openbd.jp` のみであることを検証 |
| `OpenBdCoverProvider` の戻り値 | `providers.test.ts`。`lookup` をスタブして found+cover / found+cover なし / not_found / error / 例外 / 中断済み signal / `http://` → `https://` |
| 手入力 ISBN 保存で書影が付く・付かない | 既存の ISBN 手入力保存の画面テスト（`createCoverResolver` を差し替えている箇所）に加え、openBD の `fetch` モックで書影あり・なしの 2 ケースを追加 |
| 詳細で自動取得 | `RecordDetailScreen.test.tsx` の既存の書影取得テストを維持 |
| クレジットが出ない | `RecordDetailScreen.test.tsx` を更新 |
| コードが存在しない | 削除したファイルの import が無いことを `pnpm typecheck` で確認 |
| タイトル検索不変 | `bookSearch/ndl/__tests__/` を変更しない |

差分カバレッジ（変更行の 80%）のため、`OpenBdCoverProvider` の全分岐をテストする。

## 判断ログ

1. **クレジットの仕組みごと削除する**
   - 選んだ案: `coverCredit.ts`・詳細画面の表示・テストを削除。
   - 却下した案: openBD 用の表記を追加して残す。理由: openBD の書影は出版社が許諾して openBD 経由で配布しているもので、現状も表記を出していない（`coverCreditLabel` は openBD URL で `null`）。表記が必要な取得元が将来できたら、そのとき再導入する。
   - 却下した案: 関数だけ残して常に `null`。理由: 使われないコードになる。
2. **`OpenBdCoverProvider` は `OpenBdProvider` に委譲する**
   - 選んだ案: 既存の `BookLookupProvider` を注入して `coverUrl` を取り出す。
   - 却下した案: 書影用に openBD の `fetch` と JSON 解釈を再実装（Google Books 実装と同じ形）。理由: 応答の解釈が二重になり、openBD の仕様変更時に直す箇所が増える。
   - トレードオフ: `OpenBdProvider` は `AbortSignal` を受け取らず独自のタイムアウト（10 秒）を持つ。全体 8 秒の締め切りは `createCoverResolver` の `Promise.race` で効くため、ユーザーの待ち時間は変わらない。`OpenBdProvider` を変更して signal を渡す案は、変更範囲が広がるため採らない。
3. **書影 URL の `http://` を `https://` に正規化する**: openBD の `cover` は通常 `https://cover.openbd.jp/...` だが、RN の画像読み込みで `http://` は iOS ATS / Android cleartext で失敗しうるため、防御として置換する。副作用はない。
4. **#56（このアプリについて）は変更しない**: 該当画面が現状のコードにない。Issue の補足どおり「書影の出典は openBD だけ」を前提に #56 側で扱う。
5. **後方互換なし**: Issue の指示どおり。保存済みの NDL / Google Books の書影 URL はそのまま `coverUrl` として残り、画像として読めなければ既存の挙動（文字の表紙へのフォールバックがあればそれ）に任せる。移行処理は書かない。
