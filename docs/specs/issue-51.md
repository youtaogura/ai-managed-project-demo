# Issue #51 本・漫画の書影を自動で取得する（openBD 以外の取得元を追加）

## 背景・目的

本・漫画は書影が出ると記録が楽しくなるが、今は出ないことが多い。

### 現状（コード上の事実）
- 書影の取得元は openBD の `summary.cover` だけ（`lib/bookLookup/OpenBdProvider.ts`）。`BookLookupProvider.lookupByIsbn` が書誌情報と書影をまとめて返す。
- ISBN を手入力して保存した記録、書誌情報が見つからなかった記録、openBD に書影がない本は `coverUrl: null` のまま。
- `MediaRecord.coverUrl` は既にあり、`components/Cover.tsx` が「写真 → coverUrl → 文字の表紙（`TextCover`）」の順で表示し、画像の読み込み失敗（`onError`）で次の候補・文字の表紙に落ちる。**表示側は変更不要**。
- 追加の入口は `IsbnLookupScreen` / `BarcodeScanScreen` / `TitleSearchScreen`（いずれも `lookupByIsbn` → `bookInfoToParams` → フォームの `initialValues`）。保存は `RecordFormScreen`（`repository.add/update`）、詳細は `RecordDetailScreen`。

## スコープ

### やること
1. 書影取得を書誌情報から切り離した `CoverProvider`（ISBN → 書影 URL）として作る。
2. 取得元を 2 つ追加: 国立国会図書館サーチの書影 API、Google Books API。
3. 複数の取得元を順に試す `resolveCoverUrl(isbn)`（`CompositeCoverResolver`）を作る。
4. 書影を取りにいく 3 つの場面（下記）に組み込む。
5. 外部 API のクレジット表記を、書影が出る画面に出さず、設定相当の場所がないため仕様書と README 的な扱い（判断ログ参照）とする。

### やらないこと
- 映画・ドラマ・アニメのポスターの自動取得
- 書影画像の端末への保存（URL のまま）
- 書誌情報（タイトル・作者など）の取得元の追加
- 一覧（`RecordsScreen`）表示時の取得（判断ログ参照）
- `Cover` / `CoverCard` / `TextCover` の変更、新しいライブラリ・トークンの追加（**追加なし**）、API キーの導入

## 取得元と順番

| 順 | 取得元 | 取得方法 | キー | 規約・備考 |
|---|---|---|---|---|
| 1 | openBD | 既存どおり `lookupByIsbn` の `summary.cover` | 不要 | 既存。書誌検索の流れでは追加通信なし |
| 2 | 国立国会図書館サーチ 書影 API | `https://ndlsearch.ndl.go.jp/thumbnail/{ISBN13}.jpg` を `HEAD` で確認し、200 ならその URL | 不要 | 公式の書影提供 API。NDL サーチの利用条件に従う。画像が無いと 404 |
| 3 | Google Books API | `https://www.googleapis.com/books/v1/volumes?q=isbn:{ISBN13}&maxResults=1` の `items[0].volumeInfo.imageLinks.thumbnail`（`http://` は `https://` に変換、`&edge=curl` は除去しない） | 不要（無料枠は匿名で制限あり。失敗しても書影なしで続行） | Google Books API 利用規約。書影を使うときは Google Books 由来であることを示す必要がある → クレジット表記 |

ISBN は 13 桁（`toIsbn13` 済み）で渡す。NDL は ISBN-13 でも引ける。

## 受け入れ条件

### 取得元（`lib/coverLookup/`）
- [ ] `NdlCoverProvider`: `HEAD` が 200 のとき `https://ndlsearch.ndl.go.jp/thumbnail/{isbn}.jpg` を返す。404 など 200 以外は `null`
- [ ] `GoogleBooksCoverProvider`: `imageLinks.thumbnail`（なければ `smallThumbnail`）を返し、`http://` は `https://` になる。`items` なし・`imageLinks` なし・不正な JSON は `null`
- [ ] 各 Provider は通信失敗・タイムアウト（既定 8 秒）・HTTP エラーで例外を投げず `null` を返す
- [ ] `resolveCoverUrl`: 取得元を順に試し、最初に見つかった URL を返す。先に見つかれば後ろの取得元は呼ばない。すべて `null` なら `null`。1 つの取得元が失敗しても次を試す
- [ ] ISBN が 13 桁として不正なら（`toIsbn13` が `null`）通信せず `null`

### 追加時（書誌検索の流れ）
- [ ] ISBN 入力・バーコード・タイトル検索で書誌情報が見つかり、openBD の `coverUrl` が `null` のとき、`resolveCoverUrl` で補った URL がフォームの `coverUrl` 初期値に入る（`bookInfoToParams` に渡す前に補う）
- [ ] openBD の `coverUrl` があれば、追加の通信はしない
- [ ] 書誌情報が `not_found` / `error` のときも、ISBN が分かっていれば `resolveCoverUrl` は呼ばず、保存時の取得（次項）に任せる
- [ ] 書影の補完に失敗しても、フォームへの遷移は止まらない（待ちは書誌取得の後に最大 8 秒。超えたら書影なしで進む）

### 保存時（`RecordFormScreen`）
- [ ] 種別が本・漫画で、保存する ISBN があり、`coverUrl` も `photoUri` も `null` のとき、保存前に `resolveCoverUrl` で取得し、`coverUrl` に入れて保存する（追加・編集とも）
- [ ] フォームで ISBN を手入力・変更して保存した本の記録に書影が付く。ISBN を変更し、`coverUrl` が前の ISBN の取得元由来で自動取得したものだった場合の扱いは判断ログのとおり（`coverUrl` が空のときだけ取得する。変更時の再取得はしない）
- [ ] `photoUri` があるとき、`coverUrl` が既にあるとき、取得は呼ばない（写真・既存 URL を上書きしない）
- [ ] 映画・ドラマ・アニメ（ISBN は保存されない）では取得を呼ばない
- [ ] 取得が失敗・タイムアウト・`null` でも、`coverUrl: null` のまま保存は成功する（エラー表示なし）
- [ ] 保存ボタンの二重押下防止は既存どおり。取得中も保存中の表示（既存の送信中状態）になる

### 詳細を開いたとき（`RecordDetailScreen`）
- [ ] 種別が本・漫画、ISBN あり、`coverUrl` も `photoUri` も `null` の記録を開くと、1 回だけ `resolveCoverUrl` を呼び、見つかれば `repository.update` で `coverUrl` を保存して表示に反映する
- [ ] 見つからない・失敗したときは何も表示せず（文字の表紙のまま）、記録は変更しない
- [ ] 取得は画面を開くたびに 1 回まで。取得結果が `null` でも、同じ画面表示中に再試行しない。詳細を開き直したときは再試行する（ただし下記）
- [ ] 取得完了前に画面を離れた（アンマウント）場合、状態更新も `update` も行わない
- [ ] 取得結果で `update` する際、他のフィールドは読み込んだ記録のまま（`updatedAt` は更新される）。取得中にユーザーが写真を付けた場合は上書きしない（`update` 直前に最新の記録を読み直し、`photoUri` / `coverUrl` が `null` のときだけ書く）

### 表示
- [ ] 取得した URL の画像が読み込めないとき、`Cover` が文字の表紙を出す（既存動作。回帰テストで確認）
- [ ] Google Books の書影を使った記録がある画面には出さず、クレジットは `docs/specs/issue-51.md` と詳細画面ではなく「記録の詳細」下部の小さな注記で出す（判断ログ参照）: 詳細画面で `coverUrl` が `books.google.com` / `googleusercontent.com` を含むとき「書影: Google Books」、`ndlsearch.ndl.go.jp` を含むとき「書影: 国立国会図書館サーチ」、`openbd` 由来など他は出さない

## 画面・振る舞い

- 追加フローは見た目の変化なし。書誌検索の「検索中」の表示が、書影補完の分だけ最大 8 秒長くなりうる（補完は書誌取得成功後・`coverUrl` が `null` のときのみ）。
- フォーム保存時は、既存の送信中表示のまま取得してから保存する。取得は最大 8 秒（全取得元の合計ではなく、`resolveCoverUrl` 全体で 8 秒の締め切り）。
- 詳細は先に今の表示を出し、取得できたら書影に差し替わる（バックグラウンド取得。ローディング表示なし）。
- クレジット注記は `AppText` の小さい `textSecondary` 色の 1 行。新しい色・スタイルは足さない（既存 variant を使う。無ければ判断ログの提案どおり最小の既存 variant）。
- エラー（通信失敗など）はユーザーに見せない。

## 設計

### 追加するファイル
- `src/lib/coverLookup/CoverProvider.ts` — `interface CoverProvider { readonly name: string; findCoverUrl(isbn13: string, signal: AbortSignal): Promise<string | null> }`
- `src/lib/coverLookup/NdlCoverProvider.ts` / `GoogleBooksCoverProvider.ts` — `OpenBdProvider` と同様 `fetchFn` を注入可能にする。`unknown` を型ガードで絞る（`any` / `!` 禁止）。
- `src/lib/coverLookup/resolveCoverUrl.ts` — `createCoverResolver(providers, { timeoutMs })` が `(isbn: string) => Promise<string | null>` を返す。`AbortController` で全体の締め切りを管理し、`toIsbn13` で検証、各 Provider の例外は握りつぶして次へ。
- `src/lib/coverLookup/index.ts` — `createDefaultCoverResolver()`（NDL → Google Books の順）を登録する唯一の場所（`bookLookup/index.ts` と同じ）。
- `src/lib/coverLookup/coverCredit.ts` — `coverCreditLabel(coverUrl): string | null`（クレジット表記の判定）。
- `src/hooks/useCoverResolver.tsx` — `useBookLookup` と同じ Context（`CoverResolverContextProvider` / `useCoverResolver`）。テストで差し替える。
- `src/lib/coverLookup/needsCover.ts` — `needsCover(record: Pick<MediaRecord,'kind'|'isbn'|'coverUrl'|'photoUri'>): boolean`（本・漫画 ∧ ISBN あり ∧ `coverUrl`/`photoUri` が `null`）。保存時・詳細で共用。

### 変更するファイル
- `app/_layout.tsx`（既存の Provider を並べている場所）に `CoverResolverContextProvider` を追加（`BookLookupContextProvider` の隣）。実装担当が実際のファイルを確認すること。
- `src/screens/IsbnLookupScreen.tsx` / `BarcodeScanScreen.tsx` / `TitleSearchScreen.tsx` — `found` のとき `coverUrl === null` なら `resolver(book.isbn)` で補ってから `bookInfoToParams`。共通化のため `lib/coverLookup/withCover.ts`（`withCover(book, resolver): Promise<BookInfo>`）を作る。
- `src/screens/RecordFormScreen.tsx` — `onSubmit` の中で `toNewRecordInput` 結果に `needsCover` なら `resolver` を適用（追加・編集の両方）。`RecordForm` は変更しない（#41 と衝突させない）。
- `src/screens/RecordDetailScreen.tsx` — 読み込み後の `useEffect` で `needsCover` なら取得 → 再読込 → `update`。クレジット注記を追加。

### 状態管理・データ構造
- 追加の永続データなし。`MediaRecord.coverUrl` をそのまま使う（データモデル不変、`records.v1` のマイグレーション不要）。
- 詳細の「1 回だけ」は `useRef`（記録 id 単位）で管理する。

### 依存関係
- **新しいライブラリは追加しない**（`fetch` / `AbortController` のみ）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 取得元ごとの成功・失敗・タイムアウト | `lib/coverLookup/__tests__/NdlCoverProvider.test.ts` / `GoogleBooksCoverProvider.test.ts`（`fetchFn` をモック。http→https、欠損、不正 JSON、404、例外、abort） |
| 順次フォールバック・短絡・全失敗・不正 ISBN | `resolveCoverUrl.test.ts`（偽 Provider。締め切り超過は fake timers） |
| `needsCover` / `coverCreditLabel` / `withCover` | 各 `__tests__/*.test.ts` |
| 追加時の補完（3 画面） | 既存の `IsbnLookupScreen` / `BarcodeScanScreen` / `TitleSearchScreen` のテストに追加。`found` かつ `coverUrl: null` → 補った URL が `router` の params に入る／ある場合は resolver 未呼び出し／resolver が `null` でも遷移 |
| 保存時の取得（追加・編集・手入力 ISBN・写真優先・映画で未呼び出し・失敗でも保存） | `screens/__tests__/RecordFormScreen` 系のテスト（無ければ新規）。`repository` はメモリ実装、resolver はモック |
| 詳細での遅延取得（1 回・成功で保存と表示・失敗は無変化・アンマウント・写真を上書きしない） | `RecordDetailScreen` のテストに追加 |
| 画像が読めないとき文字の表紙 | 既存 `Cover` テストの回帰（無ければ `onError` で `TextCover` になるテストを追加） |
| クレジット表示 | `RecordDetailScreen` のテスト |

通信はすべて Jest でモックし、実際の API は呼ばない。`pnpm check`（カバレッジ閾値・差分 80%）を通す。

## 判断ログ

| 論点 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|
| 取得元の採用・順番 | openBD → NDL → Google Books | Google Books を先にする | openBD は書誌取得で通信済みで追加コストなし。NDL は公式の書影 API でキー不要・日本の書籍に強い。Google Books は匿名だと割り当て制限があるため最後 |
| API キー | 使わない | Google Books のキーを `app.json` / 環境変数で持つ | アプリ配布物に埋め込んだキーは秘匿できず、運用（キー管理）が増える。失敗時は書影なしで続行できる |
| NDL の存在確認 | `HEAD` で 200 を確認 | 確認せず URL を常に保存 | 画像がない場合は `Cover` の `onError` で文字の表紙になるが、保存済みの無効 URL が残り、以後の自動取得（他の取得元）が止まる。HEAD 1 回で防げる |
| 取得を呼ぶ場面 | 追加時・保存時・詳細を開いたとき | 一覧表示時にも取得 | 一覧は件数分の通信が出るため「通信を増やしすぎない」に反する。詳細で 1 回取れれば、一覧は保存済みの URL を使う |
| 追加時の補完 | 書誌検索の `found` で `coverUrl` が `null` のときだけ補う | 常に全取得元へ問い合わせ | openBD に書影があれば通信不要 |
| 書誌が見つからなかった場合 | 追加時は補完せず、保存時の取得に任せる | 検索画面で ISBN だけでも取得する | 保存時に必ず取得が走るので同じ結果になり、検索画面の待ちが増えない |
| 保存時の再取得条件 | `coverUrl` と `photoUri` が両方 `null` のときだけ | ISBN 変更のたびに取り直す | 自動取得か手動由来かを区別するデータがなく、モデル変更（`coverSource` 追加）はスコープ外。「写真・既存 URL を上書きしない」を優先した。ISBN を直した場合の取り直しは将来課題 |
| フォームの変更範囲 | `RecordForm` は触らず `RecordFormScreen` の `onSubmit` で補う | `RecordForm` 内で取得 | #41（フォームの新デザイン、マージ済みの最新 main を前提）と重ならない。保存時の取得は画面層の責務にできる |
| 全体の待ち時間 | `resolveCoverUrl` 全体で 8 秒の締め切り | 取得元ごとに 10 秒 | 保存・検索の待ちが長くなりすぎないように。失敗しても保存は止めない |
| 詳細での取得失敗の扱い | 何も出さず、同じ表示中は再試行しない | 失敗した記録に印を保存して再試行しない | 通信失敗は一時的な可能性がある。印を持つにはデータモデルの変更が要る。開き直しのたびに最大 1 回の通信は許容範囲 |
| クレジット表記 | 詳細画面に、Google Books / NDL 由来の書影のときだけ小さく注記 | アプリ全体の「クレジット」画面を作る | 該当する画面がなく（設定画面は未実装）、スコープが広がる。書影が出る場所のそばに表記するのが規約の意図に合う。openBD は既存のため表記変更なし（利用条件は実装担当が openBD の規約を確認し、必要なら提案として PR に書く） |
| 新しいデザイン要素 | 既存の `AppText` の variant と `colors.textSecondary` を使う | 新しい文字スタイルを足す | CLAUDE.md の規約。足りなければ PR の判断ログに提案する |
| 実装時の確認事項 | 実装担当が、各 API の最新の仕様・規約（NDL の thumbnail の URL 形式、Google Books の `imageLinks`）を実装前に確認する | — | この工程ではネットワークで確認できていない。URL 形式が違えば Provider の中だけを直す（インターフェースは不変） |
