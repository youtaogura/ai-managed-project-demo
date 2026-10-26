# Issue #62 記録に取得元と外部 ID を持たせる（ISBN 以外の作品の識別に備える）

## 背景・目的

記録が外部の識別子として持つのは ISBN だけ（`MediaRecord.isbn`）。映画・ドラマ・アニメを TMDb から探せるようにする（#63）前に、「どのデータベースの、どの ID の作品か」を記録が持てるようにする。書影の自動取得・似ている作品・おすすめを、本以外にも広げるための土台になる。
この Issue は**型とデータ層（と、値を渡す経路）に限る**。画面の見た目は変えない。

### 現状（コード上の事実）
- `types/record.ts` の `MediaRecord` / `NewRecordInput`。保存は `lib/recordRepository.ts`（キー `records.v1` に JSON 配列、`KeyValueStorage` 経由）。読み込みは `lib/recordGuard.ts` の `parseRecords`（不正な要素は捨てる）。
- 追加の経路: `IsbnLookupScreen` / `BarcodeScanScreen` → `bookInfoToParams`（`lib/isbnLookupParams.ts`）、`TitleSearchScreen` → `candidateToParams`（`lib/candidateParams.ts`）→ ルートのクエリ → `paramsToInitialValues`（`lib/recordForm.ts`）→ `RecordForm`（`createFormValues` / `toNewRecordInput`）→ `repository.add`。手入力は同じフォームを空の初期値で開く。
- 国立国会図書館サーチのパーサ（`lib/bookSearch/ndl/parseNdlResponse.ts`）は `dc:identifier` を読んでいる。`xsi:type="dcndl:NDLBibID"` の識別子が国立国会図書館の書誌 ID。
- 依存の #39〜#43 の画面 Issue は #39〜#42 がマージ済み。**変更はデータ層・型・パラメータの受け渡しに限り、画面コンポーネントの見た目は触らない**（判断ログ 1）。
- #55（書き出し・読み込み）はこのリポジトリにまだ存在しない（`export` 系のコードなし）。やることに含めない（判断ログ 8）。

## スコープ

### やること
1. 取得元と外部 ID の型 `RecordSource` と、判定関数（`lib/recordSource.ts`）を追加する。
2. `MediaRecord` / `NewRecordInput` に `source: RecordSource` を追加する。
3. ISBN・バーコード（どちらも OpenBD）・タイトル検索（NDL）で追加した記録に、取得元と外部 ID を保存する。手入力は `manual`。
4. NDL の検索結果から書誌 ID（`NDLBibID`）を取り出す。
5. 保存データの版（バージョン）を持ち、起動時に 1 回だけ移行する。移行前の形式の記録は、読み込み側でも補う。
6. テストを追加・更新する。

### やらないこと
- TMDb との接続（#63）。`tmdb` は型と判定関数が扱えるところまで（データを作る UI はない）。
- 手入力の記録を、あとから作品と結びつける機能。「作品」と「版」を分ける設計（#59）。
- 画面の見た目・文言の変更。記録の詳細などへの取得元の表示。
- 書き出し・読み込み（#55）。新しい依存の追加（**追加なし**）。

## 受け入れ条件

### データ型・判定
- [ ] `RecordSource` は次のいずれか（`provider` で判別する）。`isRecordSource(value: unknown)` の型ガードがある
  - `{ provider: 'manual' }`
  - `{ provider: 'openbd'; isbn: string }`
  - `{ provider: 'ndl'; ndlId: string }`
  - `{ provider: 'tmdb'; mediaType: 'movie' | 'tv'; tmdbId: string }`
- [ ] `RECORD_SOURCE_PROVIDERS`（`['manual','openbd','ndl','tmdb']`）が定数として公開され、取得元の追加は型・型ガード・`sourceKey` の分岐を足すだけでできる（`switch` は網羅チェックされる）
- [ ] `sourceKey(source)` は、`manual` なら `null`、それ以外は取得元ごとに一意な文字列（`openbd:<isbn>` / `ndl:<ndlId>` / `tmdb:movie:<id>` / `tmdb:tv:<id>`）を返す。`tmdb` の `movie` と `tv` で同じ ID でも別のキーになる
- [ ] `isSameWork(a, b)`（`MediaRecord` 2 件を受ける）は、(1) 両方の `sourceKey` が非 null で等しければ true、(2) そうでなければ、両方の `isbn` が非 null で等しければ true、(3) それ以外は false。`manual` 同士（ISBN なし）は同じ作品とみなさない
- [ ] 空文字の ID・空白だけの ID を持つ `source` は `isRecordSource` が false を返す

### 保存
- [ ] ISBN 入力・バーコード読み取りで見つかった書誌から追加すると、`source` が `{ provider: 'openbd', isbn }`（見つかった ISBN）で保存される
- [ ] タイトル検索の候補から追加すると、候補に `ndlId` があれば `{ provider: 'ndl', ndlId }`、なく ISBN があれば `{ provider: 'openbd', isbn }`、どちらもなければ `manual` で保存される。ISBN があれば `isbn` 項目も従来どおり保存される
- [ ] 手入力（クエリなしで開いたフォーム、ISBN を手で打った場合を含む）の記録は `{ provider: 'manual' }` で保存される
- [ ] 検索・読み取り由来の記録を編集して保存しても `source` は保持される。ただし `openbd` の記録で ISBN 欄を書き換えて元の ISBN と違う値にした場合は `manual` になる（別の本を指したまま残さない）。`ndl` は ISBN を書き換えても保持される
- [ ] ほかの項目（`id` `createdAt` `photoUri` など）の保存結果は変わらない
- [ ] `parseNdlResponse` の候補に `ndlId: string | null` が入る（`dcndl:NDLBibID` の識別子の文字列。なければ null）。既存の項目の値は変わらない
- [ ] 記録追加フォームへは、クエリ `sourceProvider` / `sourceId`（と、将来の tmdb 用に `sourceType`）で渡す。`paramsToInitialValues` は不正な組み合わせを無視して `manual` にする

### 読み込み・移行
- [ ] 移行前の形式（`source` なし）で `records.v1` に保存された記録を `getAll()` で読むと、ISBN が非空なら `{ provider: 'openbd', isbn }`、それ以外は `manual` が補われ、ほかの項目は変わらない
- [ ] 保存された `source` が不正な形（未知の `provider`、ID が空など）の記録は、捨てずに ISBN の有無から補う（記録を失わない）
- [ ] 保存データの版を、別のキー `records.schemaVersion`（文字列の整数）で持つ。現行は `2`（`records.v1` のキー名は、データを動かさないため変えない）。定数 `CURRENT_SCHEMA_VERSION` と、版ごとの移行を並べる配列（今後の移行の追加場所）がある
- [ ] 起動時の移行（`migrateRecords(storage)`）: 版が未設定または 2 未満なら、`records.v1` の**生の配列の各要素**のうち `source` を持たないものにだけ `source` を足して書き戻し、最後に版を `2` にする。ほかの項目と順序は変えない。不正で読めない要素（`parseRecords` が捨てるもの）も**消さずにそのまま残す**
- [ ] 版が 2 以上なら何も書き込まない（2 回目以降の起動で `setItem` が呼ばれない）
- [ ] `records.v1` が未保存なら、書き込まずに版だけ `2` にしてよい。JSON が壊れていたら、`records.v1` を書き換えず版も上げない（次回また試す）
- [ ] 途中で失敗しても（`setItem` が reject、読み取りが reject）例外を外へ投げず、元の `records.v1` は読める。記録の書き込みに失敗したら版は上げない。記録の書き込みに成功して版の書き込みだけ失敗した場合は、次回の移行が冪等（すでに `source` があるものは変えない）なので安全
- [ ] 移行はアプリ起動時に 1 回だけ走る（`RecordRepositoryProvider` のマウント時）。移行が終わる前の `add` / `update` / `delete` / `getAll` は移行の完了を待つ（移行と書き込みの競合を避ける）。移行が失敗しても、それらは通常どおり動く

### 画面
- [ ] 画面の見た目・文言は変わらない（既存の画面テストが、期待値を変えずに通る。テストの補助データ `makeRecord` に `source` を足すだけ）

## 画面・振る舞い

画面の変更はない。ユーザーから見える振る舞いの変化は「追加した記録が、裏で取得元を持つ」ことだけ。

- 探して追加: 書誌を選ぶ → フォームが取得元つきで開く（ユーザーには見えない）→ 保存で `source` が記録に入る。
- 手入力: 従来どおり。`manual`。
- 起動: 画面を出す前にブロックしない（移行は非同期。記録を読む処理だけが完了を待つ）。移行に失敗しても、エラー表示は出さず、記録は旧形式のまま読める（読み込みが補う）。

## 設計

### データ構造

```ts
// types/record.ts
export const RECORD_SOURCE_PROVIDERS = ['manual', 'openbd', 'ndl', 'tmdb'] as const;
export type RecordSourceProvider = (typeof RECORD_SOURCE_PROVIDERS)[number];
export type RecordSource =
  | { provider: 'manual' }
  | { provider: 'openbd'; isbn: string }
  | { provider: 'ndl'; ndlId: string }
  | { provider: 'tmdb'; mediaType: 'movie' | 'tv'; tmdbId: string };

export type MediaRecord = { …既存…; source: RecordSource };
// NewRecordInput は Omit 型なので source が自動で入る
```

保存される JSON の例: `{"…":"…","isbn":"9784…","source":{"provider":"openbd","isbn":"9784…"}}`。

### 追加・変更するファイル

| ファイル | 内容 |
|---|---|
| `src/types/record.ts` | 上記の型・定数を追加し、`MediaRecord` に `source` |
| `src/lib/recordSource.ts`（新規） | `isRecordSource` / `sourceKey` / `isSameWork` / `sourceFromIsbn(isbn)`（非空なら openbd、なければ manual）/ `sourceToParams(source)` / `paramsToSource(params)` |
| `src/lib/recordGuard.ts` | `source` を読む。なし・不正なら `sourceFromIsbn(isbn)` で補う |
| `src/lib/recordMigration.ts`（新規） | `CURRENT_SCHEMA_VERSION` / `SCHEMA_VERSION_STORAGE_KEY` / `MIGRATIONS`（`{ to: 2, run(rawItems) }` の配列）/ `migrateRecords(storage)`（失敗しても throw しない。`Promise<void>`） |
| `src/lib/recordRepository.ts` | `migrate(): Promise<void>` を公開（結果を memoize。`getAll`/`add`/`update`/`delete` は先頭で await。失敗は握りつぶす）。`RECORDS_STORAGE_KEY` は変えない |
| `src/hooks/useRecordRepository.tsx` | `RecordRepositoryProvider` のマウント時に `repository.migrate()` を 1 回呼ぶ（`useEffect`、`void`）。呼べないテスト用スタブ（`repository` を差し込む場合）でも落ちないよう、`migrate` は `RecordRepository` の必須メソッドとし、`testUtils.ts` のスタブに足す |
| `src/lib/recordForm.ts` | `RecordFormValues` に `source: RecordSource` と `originalIsbn: string`（編集開始時の ISBN。openbd の降格判定用）を足す。`createFormValues` は `initial.source ?? manual`。`toNewRecordInput` は下記の規則で `source` を決める。`paramsToInitialValues` は `paramsToSource` を使う |
| `src/lib/isbnLookupParams.ts` | `bookInfoToParams` が `sourceProvider=openbd` `sourceId=<isbn>` を足す |
| `src/lib/candidateParams.ts` | `candidateToParams` が `ndlId` / `isbn` に応じて `sourceProvider` `sourceId` を足す。`titleOnlyParams` は変えない（手入力なので manual） |
| `src/types/bookSearch.ts` | `BookCandidate` に `ndlId: string \| null` |
| `src/lib/bookSearch/ndl/parseNdlResponse.ts` | `extractNdlId(identifiers)`（`xsi:type === 'dcndl:NDLBibID'` の最初の非空テキスト）で `ndlId` を設定 |
| `src/testUtils.ts` | `makeRecord` に `source: { provider: 'manual' }`、リポジトリのスタブに `migrate` |
| 既存テスト | `BookCandidate` / `MediaRecord` / `NewRecordInput` のリテラルが型エラーになるものに `ndlId: null` / `source` を足す（期待値の意味は変えない） |

画面（`screens/` `components/`）は、型エラーの解消以外では変更しない（`RecordForm` は `createFormValues` を通すだけなので、原則変更不要）。

### `toNewRecordInput` の `source` 決定規則

1. `values.source.provider === 'openbd'` で、保存する `isbn`（空なら null）が `values.source.isbn` と異なる → `manual`
2. 上記以外は `values.source` のまま。
   - ※`kind` を book/manga 以外に変えると `isbn` は null で保存される。このとき `openbd` なら 1 により `manual` になる。

### パラメータの受け渡し

`sourceToParams(source)` → `{ sourceProvider, sourceId, sourceType? }`（`manual` は空）。`paramsToSource(params)` は `provider` が `openbd` / `ndl` で `sourceId` が非空のとき、`tmdb` で `sourceType ∈ {movie,tv}` かつ `sourceId` 非空のときだけ対応する `source` を返し、それ以外は `manual`。`isbn` クエリだけが渡った場合（`isbnOnlyParams` など、手入力へ移るとき）は `manual` のまま（判断ログ 4）。

### 移行の流れ（`migrateRecords`）

1. `records.schemaVersion` を読む。数値で `>= 2` なら終了（書き込みなし）。
2. `records.v1` の生の文字列を読む。`null` なら版だけ書いて終了。`JSON.parse` に失敗、または配列でなければ何も書かず終了。
3. 各要素: オブジェクトで `source` を持たない（`'source' in item` が偽）→ `{ ...item, source: sourceFromIsbn(item.isbn) }`（`isbn` が文字列でなければ manual）。それ以外はそのまま。
4. 1 つでも変わっていれば `records.v1` を書く。続けて版を書く。
5. 全体を `try/catch` で囲み、失敗は握りつぶす（`false` を返す。呼び出し側は無視）。

「不正な `source` を持つ要素」は移行では触らず、読み込み側（`recordGuard`）が毎回補う。

### 状態管理
React の state・context の追加なし。`RecordRepository` に `migrate` が増えるだけ。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 型ガード・`sourceKey`・`isSameWork`・`sourceFromIsbn`・params 変換（空 ID、tmdb の movie/tv 区別、manual 同士、ISBN フォールバック） | `lib/__tests__/recordSource.test.ts`（新規） |
| `ndlId` の抽出 | `lib/bookSearch/ndl/__tests__/parseNdlResponse.test.ts`（`NDLBibID` あり・なし・空） |
| 読み込みで補う（ISBN あり/なし/空文字、不正な `source`、ほかの項目が不変） | `lib/__tests__/recordGuard.test.ts`、`recordRepository.test.ts` |
| 移行（初回、2 回目は `setItem` 0 回、未保存、壊れた JSON、`setItem` 失敗で版が上がらない・元の記録が読める、不正要素を消さない、冪等） | `lib/__tests__/recordMigration.test.ts`（新規、`createMemoryStorage` + 失敗する storage のスタブ） |
| 移行完了前の操作が待つ・移行失敗でも動く | `recordRepository.test.ts` |
| Provider のマウントで `migrate` が 1 回呼ばれる | `hooks/__tests__/useRecordRepository.test.tsx` |
| 追加時に `source` が保存される（openbd / ndl / ISBN のみ候補 / 手入力）・編集で保持 / 降格 | `lib/__tests__/recordForm.test.ts`（`createFormValues` `toNewRecordInput` `paramsToInitialValues`）、`lib/__tests__/isbnLookupParams.test.ts`、`candidateParams.test.ts`、および `screens/__tests__/RecordFormScreen.test.tsx` に「クエリつきで開いて保存すると、リポジトリへ渡る `source` が一致する」ケースを足す（ISBN 入力・タイトル検索の既存画面テストにも、遷移時のパラメータに `sourceProvider` が含まれることを足す） |
| 見た目が変わらない | 既存の画面・部品テストが期待値を変えずに通る |

`pnpm check` を通すこと。変更行のカバレッジ 80% 以上（新規 lib はすべて純粋関数なので分岐を網羅する）。

## 判断ログ

1. **進行中の画面 Issue との衝突**: 選んだ案は、変更を型・データ層・パラメータの受け渡しに限る。#39〜#42 はマージ済みで、#43 など残りがぶつかっても `screens/` `components/` を触らなければ衝突しにくい。却下: #43 の完了待ち（先送りになり、#63 が止まる）。
2. **`source` の形**: 選んだ案は、判別付き共用体（`provider` ごとに必要な ID の形が違う）。却下: `{ provider, externalId: string, mediaType? }` のフラット形（TMDb の `mediaType` が他の取得元で意味を持たない null になる、必須項目の取り違えを型で防げない）。却下: `isbn` を `source` に統合して `isbn` 項目を廃止（記録の詳細・フォーム・テストへの影響が大きく、Issue の「画面は変わらない」に反する。`isbn` 項目は表示用の事実として残す）。
3. **ID の保存場所**: 選んだ案は、`source` の中に ID を持つ（`openbd` の `isbn` は `MediaRecord.isbn` と重複するが、手入力で `isbn` を書き換えたかの判定と「どの ID で結びついたか」の保存に必要）。却下: 別の `externalId` 項目を並べる（`provider` と ID の対応がずれうる）。
4. **ISBN が分かっているが検索・読み取り由来でない記録**: `manual`。Issue は「手入力は `manual`（まだ作品と結びついていない）」。ISBN を手で打った場合も `manual`。ただし、既存データの移行では Issue の指定どおり「ISBN があれば `openbd` と ISBN」にする（過去の記録は由来が分からないため ISBN を信頼する）。ISBN 入力画面で「見つかりませんでした」→ 手入力へ移った記録も `manual`。
5. **タイトル検索で NDL ID がなく ISBN がある候補**: `openbd` + ISBN。ISBN があれば作品を一意に決められ、移行の規則とも揃う。却下: `ndl` に ID なしで保存（ID を持たない取得元は不整合の元）。NDL ID も ISBN もある候補は `ndl`（`isbn` 項目に ISBN も残るので `isSameWork` の ISBN フォールバックで ISBN 由来の記録とも同じ作品と判定できる）。
6. **ISBN 欄を書き換えたとき**: `openbd` は `manual` に降格、`ndl` は保持。ISBN と別の本を指したままにしないため。却下: 常に保持（誤った結びつきが残る）、常に manual に降格（NDL ID は ISBN と独立なので情報を捨てる）。
7. **保存データの版**: 選んだ案は、別キー `records.schemaVersion` + 既存キー `records.v1` のまま。キー名を変えると、旧データを別キーへ移す途中の失敗で記録を失うリスクが増える。却下: `records.v2` へ移し替える（上記）、`{ version, records }` のラッパー形式（読み込み側が全面的に変わる、旧形式との判別が必要）。
8. **#55（書き出し・読み込み）**: このリポジトリにはまだなく、先に完了していない。したがって書き出す形式への対応は行わない。#55 の実装時に、`source` を含め、`source` のない古いファイルは `sourceFromIsbn` で補うこと（`recordGuard` が補うので、`parseRecords` を通せば足りる）を、この仕様書から参照できる。
9. **移行の書き込み方**: 生の要素に `source` を足すだけにして、`parseRecords` を通さない。通すと、検証に通らない記録が移行で消えるため（「失敗しても記録を壊さない」）。不正な `source` は読み込み側が毎回補う。
10. **移行のタイミング**: 選んだ案は、Provider のマウント時に非同期で 1 回走らせ、リポジトリの各操作が完了を待つ。却下: 画面表示前に await（起動が遅くなる、失敗時のハンドリングが増える）、読み込みのたびに補うだけで書き戻さない（版を持つ Issue の要件を満たさない）。
11. **`tmdb` の ID の型**: `tmdbId` は文字列（URL クエリ・JSON でそのまま扱うため）。`mediaType` は `movie` / `tv`（TMDb の API の呼称）。`kind`（本・映画・ドラマ・アニメ）とは別物で、ドラマ・アニメが `tv` か `movie` かは #63 で決める。
12. **新しい依存**: なし。
