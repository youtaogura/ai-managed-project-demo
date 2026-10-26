# Issue #63 映画・ドラマ・アニメを TMDb から探して記録できるようにする

## 背景・目的

映画・ドラマ・アニメは手入力しかなく、表記揺れで同じ作品か判断できず、ポスターも付かない。TMDb（The Movie Database）から作品を探して記録できるようにし、本と同じ「まず探す、見つからなければ手入力」の流れにする。#62 で入れた取得元（`RecordSource` の `tmdb`）を、この Issue で初めて実際に保存する。

### 現状（コード上の事実）
- 本のタイトル検索は `BookSearchProvider`（`lib/bookSearch/`）+ `useBookSearch`（Context）+ `TitleSearchScreen` + `BookSearchRow`。Provider は `createDefaultBookSearchProvider()` が登録する唯一の場所。
- `RecordSource` に `{ provider: 'tmdb'; mediaType: 'movie' | 'tv'; tmdbId }`、`sourceToParams` / `paramsToSource`（クエリ `sourceProvider` `sourceType` `sourceId`）、`paramsToInitialValues` が `source` を受ける（#62 済み）。`toNewRecordInput` は `tmdb` の `source` をそのまま保存する（`openbd` のときだけ ISBN 変更で降格）。
- `AddSheet`（`components/AddSheet.tsx`）は `AddTarget = 'scan' | 'search' | 'isbn' | 'manual'`。下の段「映画・ドラマ・アニメ、ISBN のない本」に「手で入力する」だけがある。`RecordsScreen` が `ADD_ROUTES` で `router.push`、`manual` は `onAdd`（`app/(tabs)/index.tsx` で `/record/new`）。
- `Cover` は `coverUrl` があれば画像、なし・読み込み失敗で `TextCover`。`RecordFormScreen` の書影の自動取得（#51）は本・漫画のみで、映画などには働かない。
- 環境変数は `process.env.EXPO_PUBLIC_*` を `app/_layout.tsx` で 1 つ使っている前例のみ。
- **#48（使う種別の設定）と #56（このアプリについて）はこのリポジトリにまだ存在しない**（設定画面・種別の設定コードなし）。→ 判断ログ 9・10。

## スコープ

### やること
1. TMDb の検索 Provider（`MediaSearchProvider`）を作る。映画＝movie、ドラマ＝tv、アニメ＝movie と tv の両方（アニメーションのジャンル優先）。日本語（`ja-JP`）、なければ原題。
2. 検索結果の行・検索画面（`MediaSearchScreen`、見た目は本のタイトル検索と同じ）。種別は `ChipGroup` で切り替える。
3. 選ぶと、タイトル・監督など・ポスター・種別・取得元 `tmdb`（movie/tv と ID）が入った状態で追加画面へ。
4. 追加シートの構成変更（下の段を「映画・ドラマ・アニメ」にして「タイトルで探す」を先頭、「手で入力する」を次。上の段「本・漫画」に「手で入力する」を足す）。
5. TMDb のクレジット表記（検索画面の下）。
6. API キーを環境変数から読む。未設定なら TMDb の検索の入口を出さない。

### やらないこと
- 「似ている作品」「おすすめ」、出演者・あらすじ・ジャンルの保存と表示
- 既存の手入力の記録を TMDb の作品と結びつける機能
- 商用利用の契約
- 「このアプリについて」（#56）へのクレジット表記（画面がまだ無い。判断ログ 10）
- 使う種別の設定（#48）との連携（設定がまだ無い。判断ログ 9）
- TMDb のロゴ画像の掲載（人間が公式アセットを入れる。判断ログ 8）
- 新しいライブラリの追加（**追加なし**。`fetch` / `AbortController` のみ）

## 受け入れ条件

### Provider・応答の検証（`lib/mediaSearch/`）
- [ ] 映画で検索すると `GET /3/search/movie`、ドラマは `/3/search/tv`、アニメは両方（並列）を、`language=ja-JP` `include_adult=false` `query=<キーワード>` で呼ぶ
- [ ] 応答の `results` の各要素を型ガードで検証し、形が不正な要素は捨てる。`results` がない・JSON 以外・オブジェクトでない応答は `{ status: 'error', reason: 'invalid_response' }`。例外で落ちない
- [ ] 候補は `{ mediaType: 'movie' | 'tv', tmdbId: string, title, creator: string | null, year: string | null, posterUrl: string | null, isAnimation: boolean }`。`title` は日本語タイトル（movie は `title`、tv は `name`）。空・空白のときは原題（`original_title` / `original_name`）。両方空の要素は捨てる
- [ ] `year` は movie の `release_date`、tv の `first_air_date` の先頭 4 桁（`YYYY` 形式でなければ null）
- [ ] `posterUrl` は `poster_path` があれば `https://image.tmdb.org/t/p/w185<poster_path>`、なければ（null・空・型違い）null
- [ ] `isAnimation` は `genre_ids` に `16`（Animation）を含むとき true
- [ ] 監督など: 検索後、表示する候補ごとに詳細を取得する。movie は `GET /3/movie/{id}?append_to_response=credits&language=ja-JP` の `credits.crew` のうち `job === 'Director'`（複数なら「、」区切りで最大 2 人）、tv は `GET /3/tv/{id}?language=ja-JP` の `created_by[].name`（最大 2 人）。取れない・詳細の取得が失敗・不正な形は `creator: null`（検索全体は失敗にしない）
- [ ] アニメの並び: movie と tv の結果を合わせ、`isAnimation` の候補を先に、そのあとにそれ以外。各グループの中は TMDb の返した順（movie → tv の順にインターリーブ）を保つ。合計は最大 10 件（`MAX_RESULTS`）。映画・ドラマ単体も最大 10 件
- [ ] 通信失敗・HTTP エラー（401 含む）は `{ status: 'error', reason: 'network' }`、タイムアウト（既定 10 秒）も `network`。0 件は `{ status: 'ok', candidates: [] }`
- [ ] 認証: API キーが JWT 形式（`eyJ` で始まる Read Access Token）なら `Authorization: Bearer <token>` ヘッダ、それ以外は `api_key=<key>` クエリ。どちらも `fetchFn` のモックで検証できる
- [ ] `createDefaultMediaSearchProvider(apiKey)` は、キーが `undefined`・空文字・空白のみのとき `null` を返す。それ以外は `TmdbSearchProvider`

### 記録への保存
- [ ] 候補をタップすると `/record/new` へ `router.replace` で遷移し、クエリは `kind`（movie→`movie`、drama→`drama`、anime→`anime`。選んだ検索種別で決める）、`title`、`creator`（あれば）、`coverUrl`（ポスターがあれば）、`sourceProvider=tmdb`、`sourceType=movie|tv`、`sourceId=<TMDb ID>`
- [ ] そのまま保存すると記録に `source: { provider: 'tmdb', mediaType, tmdbId }`、`coverUrl` にポスター URL、`kind`、`title`、`creator` が入る。ISBN・出版社は `null`
- [ ] 保存した記録を編集して保存しても `source` は保持される（ISBN 欄は映画などに出ないので降格しない）
- [ ] アニメで movie の候補を選べば `mediaType: 'movie'`、tv の候補なら `tv`（種別 `anime` のまま）

### 検索画面
- [ ] 検索欄・「検索」ボタン・結果件数・下に固定の「見つからないので手で入力する」とクレジットは、本のタイトル検索と同じ構成と見た目
- [ ] 上に `ChipGroup`（ラベル「種別」、選択肢「映画」「ドラマ」「アニメ」）。初期値は「映画」。切り替えても入力中のキーワードは残り、結果とエラー表示は消えて idle に戻る
- [ ] 結果の行: ポスター（なければ `TextCover`＝文字の表紙。画像の読み込み失敗でも文字の表紙）、タイトル、監督など（あれば）、「公開年 · 種別」（種別は movie→「映画」、tv→「ドラマ」。アニメ検索の結果は `isAnimation` なら「アニメ」、そうでなければ movie→「映画」、tv→「ドラマ」）。公開年がなければ種別だけ
- [ ] キーワードが空（空白のみ含む）で検索すると「キーワードを入力してください」を出し、通信しない
- [ ] 検索中はインジケーター（検索ボタン・入力・行は操作不可）。0 件は「見つかりませんでした」、通信失敗・タイムアウト・不正な応答は「検索できませんでした。通信状況を確認してください」と「再試行」。どの状態でも「見つからないので手で入力する」が押せる
- [ ] 「見つからないので手で入力する」は `/record/new` へ `kind`（選択中の種別）と `title`（入力中のキーワード。空なら付けない）で遷移する（`source` なし＝手入力）
- [ ] 検索結果を選んだあとの二重タップ防止は既存の検索画面と同じ
- [ ] クレジット: 「This product uses the TMDB API but is not endorsed or certified by TMDB.」を画面下に表示する（`MediaSearchProvider.attribution`）

### 追加シート・API キー
- [ ] 追加シートの構成: 見出し「本・漫画」の下に「バーコードを読み取る」「タイトルで探す」「ISBN を入力する」「手で入力する」。その下に見出し「映画・ドラマ・アニメ」、先頭が「タイトルで探す」、次が「手で入力する」
- [ ] 上の段の「手で入力する」は `/record/new`（`kind=book`）、下の段は `/record/new?kind=movie`（種別は映画で開く。フォームで変えられる）
- [ ] 下の段の「タイトルで探す」は `/record/media-search` へ遷移する
- [ ] API キー未設定（`createDefaultMediaSearchProvider` が `null`）のとき、下の段に「タイトルで探す」は出ず、「手で入力する」は出て使える。本の入口は変わらない
- [ ] 同じアクセシビリティラベルが 2 つできないよう、上の段の「タイトルで探す」「手で入力する」と下の段のものは `accessibilityLabel` を区別する（「本をタイトルで探す」「本を手で入力する」「映画・ドラマ・アニメをタイトルで探す」「映画・ドラマ・アニメを手で入力する」。表示文言は図のとおり「タイトルで探す」「手で入力する」）
- [ ] 本の検索・ISBN・バーコードの動作と既存テストの期待値は変わらない（`AddSheet` の `onSelect` の識別子の変更に伴うテストの更新を除く）

## 画面・振る舞い

### 追加シート
```
何を記録しますか                     ×
本・漫画
[バーコードを読み取る][タイトルで探す]   ← 既存の 2 タイル
ISBN を入力する                      ›
手で入力する                         ›   ← 追加（枠線の行）
映画・ドラマ・アニメ
タイトルで探す                       ›   ← 追加（surface2 の行。キー未設定なら出さない）
手で入力する                         ›   ← 枠線の行
```
`docs/design-system/screens/add-sheet.png` との違い: 下の段の見出しが「映画・ドラマ・アニメ」になり、「タイトルで探す」が先頭に増え、上の段に「手で入力する」が増える（Issue の記述を優先。PR に差異を書く）。

### 検索画面（`/record/media-search`）
状態: `idle` → `searching` → `results` / `empty` / `error`、空キーワードは `invalid`、選択後の詳細解決中は `resolving`（※詳細は検索時に取得済みなので、`select` は同期的に遷移し `resolving` は不要。判断ログ 5）。
- 検索中: 入力・ボタン・行を無効にしインジケーター。
- 結果: 「「<キーワード>」の検索結果 N 件」＋行リスト。行タップで `router.replace('/record/new', params)`。
- 失敗: 赤字メッセージ＋「再試行」（同じキーワード・同じ種別で再検索）。
- 下固定: 「見つからないので手で入力する」（0 件のときは primary、他は outline）、クレジット（micro・textTertiary・中央）。
- 入力・種別を変えたら idle に戻る（検索中を除く）。

## 設計

### 追加するファイル
| ファイル | 内容 |
|---|---|
| `src/types/mediaSearch.ts` | `MediaSearchKind = 'movie' \| 'drama' \| 'anime'`（`MediaKind` の部分集合）、`MediaCandidate`、`MediaSearchError`（`'network' \| 'invalid_response'`）、`MediaSearchResult`（`BookSearchResult` と同形） |
| `src/lib/mediaSearch/MediaSearchProvider.ts` | `interface MediaSearchProvider { readonly attribution: string; search(keyword: string, kind: MediaSearchKind): Promise<MediaSearchResult> }` |
| `src/lib/mediaSearch/tmdb/TmdbSearchProvider.ts` | `fetchFn` / `timeoutMs` / `apiKey` を注入できる（`NdlSearchProvider` と同形）。`AbortController` で全体の締め切り |
| `src/lib/mediaSearch/tmdb/parseTmdb.ts` | 型ガードと変換: `parseSearchResults(json, mediaType)`、`parseCreators(json, mediaType)`。`unknown` から絞り込む（`any` / `!` 禁止） |
| `src/lib/mediaSearch/index.ts` | `createDefaultMediaSearchProvider(apiKey: string \| undefined): MediaSearchProvider \| null`。Provider を登録する唯一の場所 |
| `src/lib/mediaSearch/orderCandidates.ts` | アニメの並び替え（`orderAnimeCandidates(movies, tvs, limit)`）。純粋関数 |
| `src/lib/mediaCandidateParams.ts` | `mediaCandidateToParams(candidate, kind)` / `mediaTitleOnlyParams(keyword, kind)` / `mediaKindLabel(candidate)`（行の「映画／ドラマ／アニメ」） |
| `src/hooks/useMediaSearch.tsx` | `MediaSearchContextProvider`（`provider?: MediaSearchProvider \| null` を受け、`undefined` なら `createDefaultMediaSearchProvider(process.env.EXPO_PUBLIC_TMDB_API_KEY)`。`null` は「未設定」として保持）と `useMediaSearch(): MediaSearchProvider \| null`。`process.env.EXPO_PUBLIC_TMDB_API_KEY` はビルド時に埋め込まれるため、**この 1 箇所で式をそのまま書く**（間接参照しない） |
| `src/components/MediaSearchRow.tsx` | `BookSearchRow` と同じレイアウト。`Cover` に `kind` と `coverUrl: posterUrl` を渡す |
| `src/screens/MediaSearchScreen.tsx` | `TitleSearchScreen` と同構成。種別 `ChipGroup`（`compact`）を検索欄の下に置く。文言定数は `TitleSearchScreen` の `ERROR_KEYWORD_EMPTY` / `MESSAGE_EMPTY` / `MESSAGE_SEARCH_ERROR` を再利用する |
| `src/app/record/media-search.tsx` | ルート（`record/search.tsx` と同形） |

### 変更するファイル
| ファイル | 内容 |
|---|---|
| `src/components/AddSheet.tsx` | `AddTarget` を `'scan' \| 'search' \| 'isbn' \| 'manual' \| 'mediaSearch' \| 'mediaManual'` に。`mediaSearchEnabled: boolean` を props に追加。構成は上の図 |
| `src/screens/RecordsScreen.tsx` | `useMediaSearch() !== null` を `AddSheet` に渡す。`ADD_ROUTES` に `mediaSearch: '/record/media-search'`。`manual` は `onAdd?.()`（本）、`mediaManual` は `router.push({ pathname: '/record/new', params: { kind: 'movie' } })`。`onAdd` の署名は変えない |
| `src/app/_layout.tsx` | `MediaSearchContextProvider` を `BookSearchContextProvider` の内側に追加 |
| `src/lib/recordForm.ts` | 変更なし（`paramsToInitialValues` がすでに `kind` `coverUrl` `source` を受ける。テストで確認のみ） |
| 既存テスト | `AddSheet` / `RecordsScreen` のテストを新しい構成に合わせて更新（`mediaSearchEnabled` の有無・ラベルの区別） |

### 状態管理・データ構造
- 永続データの追加なし（`MediaRecord` は #62 で `source` 済み）。`records.v1` の移行なし。
- 検索画面の状態は `TitleSearchScreen` と同じ `useState`。選択中の種別は `useState<MediaSearchKind>('movie')`。
- API キーの有無は Provider が `null` かどうかで表す（Context の値）。

### 外部 API の仕様（実装担当が公式ドキュメントで再確認すること）
- ベース: `https://api.themoviedb.org/3`。検索 `/search/movie` `/search/tv`、詳細 `/movie/{id}`（`append_to_response=credits`）、`/tv/{id}`。
- ポスター: `https://image.tmdb.org/t/p/w185{poster_path}`（行は幅 44pt なので w185 で十分）。
- TMDb の利用条件（非商用・クレジット表記・ロゴ）は実装前に確認する。表記文言は公式の指定（"This product uses the TMDB API but is not endorsed or certified by TMDB."）を使う。違えば定数 1 か所を直す。
- この環境ではネットワーク確認ができない前提のため、URL・フィールド名が違えば `TmdbSearchProvider` / `parseTmdb` の中だけを直す（インターフェースは不変）。

### 依存関係
- **新しいライブラリは追加しない。**
- 環境変数名: `EXPO_PUBLIC_TMDB_API_KEY`（Expo が `EXPO_PUBLIC_` 付きをクライアントに埋め込む。値は v3 API キーか v4 Read Access Token のどちらでも可）。`.env` は `.gitignore` 済み。人間が `.env` と EAS の環境変数に設定する（PR 本文にも書く）。

## テスト方針

通信はすべて `fetchFn` のモック。実際の API は呼ばない。

| 受け入れ条件 | テスト |
|---|---|
| 検索エンドポイント・クエリ・認証・種別ごとの呼び分け・タイムアウト・HTTP エラー | `lib/mediaSearch/tmdb/__tests__/TmdbSearchProvider.test.ts` |
| 型ガード・不正な形・日本語タイトル／原題へのフォールバック・year・poster・isAnimation・監督/制作者 | `parseTmdb.test.ts`（ふつうの形、欠損、型違い、`null`、配列でないなど） |
| アニメの並び・件数上限 | `orderCandidates.test.ts` |
| キー未設定で `null` | `lib/mediaSearch/__tests__/index.test.ts` |
| クエリ変換（kind、coverUrl、source、タイトルのみ）と行の種別ラベル | `lib/__tests__/mediaCandidateParams.test.ts`。さらに `paramsToInitialValues` で `source` が `tmdb` になることを `recordForm.test.ts` に追加 |
| 検索画面の各状態・種別切替・空キーワード・選択して遷移・手入力・クレジット・二重タップ防止 | `screens/__tests__/MediaSearchScreen.test.tsx`（`TitleSearchScreen.test.tsx` と同形。偽 Provider を Context で差し込む） |
| 行（ポスターなし→文字の表紙、「公開年 · 種別」） | `components/__tests__/MediaSearchRow.test.tsx` |
| 保存した記録に `tmdb` の `source`・`coverUrl` が入る・編集で保持 | `RecordFormScreen` の既存テストに、`paramsToInitialValues` 経由の追加・編集ケースを追加（メモリの repository） |
| 追加シートの構成・ラベル・キー未設定で「タイトルで探す」が出ない・遷移先 | `AddSheet` / `RecordsScreen` のテストを更新・追加 |
| 本の検索・ISBN・バーコードが変わらない | 既存テストが期待値を変えずに通る |

`pnpm check`（カバレッジ・差分 80%）を通す。

## 判断ログ

| # | 論点 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|---|
| 1 | 取得元の抽象 | `MediaSearchProvider`（`BookSearchProvider` と別 interface）、`search(keyword, kind)` | `BookSearchProvider` を一般化して共有 | 候補の形（ISBN・出版社 vs TMDb の種類・ID・ポスター）が違い、既存の本の検索（変更しない条件）に手を入れずに済む。登録場所と Context の形は同じにして慣習を揃える |
| 2 | 監督など | 検索後に表示する最大 10 件の詳細を並列取得（movie は `credits`、tv は `created_by`）。失敗した候補は `creator: null` | 選択時にだけ取得／検索結果の行では出さない | Issue が「行に監督など」を求めている。TMDb の検索 API は監督を返さないため詳細が要る。10 件に絞れば通信量は許容範囲で、選択時は追加通信なしで遷移できる（本の選択より速い） |
| 3 | アニメの並べ方 | movie と tv を合わせ、アニメーション（genre 16）を先、残りを後。各グループは TMDb の順を保ち movie/tv を交互に。最大 10 件 | movie 全部の後に tv／人気順に統合ソート | Issue が「アニメーションのジャンルを優先」と定める。TMDb の人気スコア（`popularity`）は movie と tv で比較しにくいので、返却順を尊重する。アニメ以外も残すのはジャンル付けが不完全な作品を取りこぼさないため |
| 4 | 種別（kind）の決め方 | 検索画面で選んだ種別をそのまま記録の `kind` にする（アニメ検索で出た tv は `anime` + `tmdb/tv`） | TMDb の種類から `movie`/`drama` に決める | アニメの記録は `anime` で持つのがアプリの種別の設計。`source.mediaType` が TMDb の種類を別に持つので情報は失われない |
| 5 | 選択時の処理 | 同期的に `router.replace`（`resolving` 状態なし） | 本と同じく選択時に追加の通信 | 詳細は検索時に取得済みで、選択時に取るものがない。ポスター URL も候補が持つ |
| 6 | API キーの形式 | `EXPO_PUBLIC_TMDB_API_KEY` 1 つ。`eyJ` で始まれば Bearer、それ以外は `api_key` クエリ | 変数を 2 つに分ける／Bearer のみ | Issue が「API キー（または Read Access Token）」と両方に触れている。どちらを入手しても 1 つの変数に入れれば動く |
| 7 | キー未設定の扱い | `createDefaultMediaSearchProvider` が `null`。Context の値も `null`。追加シートは「タイトルで探す」だけ隠し「手で入力する」は出す | キー未設定でも入口を出し、検索時にエラー | Issue の要求。アプリは壊れず、手入力で使える |
| 8 | クレジットとロゴ | 検索画面の下に公式の表記文言を `AppText` の micro で表示。**ロゴ画像は追加しない** | ロゴ画像を作る・外部から取得して掲載 | ロゴは TMDb 指定のアセットが必要で、エージェントはネットワークで取得・検証できず、画像の追加は `app/assets` の人間管理の領域（デザインの正本も無い）。人間がアセットを用意するときの追従作業として PR に書く |
| 9 | 使う種別（#48）との連携 | 未実装なので連携しない。下の段は常に出す（キーがあれば「タイトルで探す」も）。初期の種別は「映画」 | 種別設定のスタブを作る | #48 のコードがこのリポジトリにない。Issue は「#48 の最初の種別」「すべて外していれば入口を出さない」としているので、#48 のマージ後に `AddSheet` の `mediaSearchEnabled` と初期種別を差し替える（フォローアップ）。PR に書く |
| 10 | 「このアプリについて」（#56）のクレジット | 今回は出さない（画面が存在しない） | 画面を先に作る | スコープが広がる。#56 側で `TmdbSearchProvider` の `attribution` 定数を再利用できるよう、文言は `lib/mediaSearch/tmdb/` から export しておく |
| 11 | 手入力の種別 | 下の段は `kind=movie`、上の段は `kind=book`（従来どおり） | 種別を選ばせる中間画面 | フォームで種別を変えられるので追加の画面は不要。映画が最初の種別という検索画面の初期値とも揃う |
| 12 | ラベルの重複 | 上下の段で `accessibilityLabel` を区別する（表示文言は同じ） | ラベルも同じにする | テスト・スクリーンリーダーで一意に特定できるようにするため |
| 13 | `AddTarget` の命名 | 既存の `manual` は本の手入力のまま、新設の `mediaSearch` / `mediaManual` を追加 | `manual` をメディア用に付け替え | 既存の `RecordsScreen` の `onAdd` の契約（本の手入力）を変えずに済む |
| 14 | ポスターの画像サイズ | `w185` | `original` / `w500` | 行は小さい（幅 44pt）ため十分。通信量を抑える。記録に保存する `coverUrl` も同じ URL（詳細の表示でも極端にぼけないサイズ） |
| 15 | 取得に使うキーが漏れる件 | クライアントから直接呼ぶ（Issue の方針どおり）。読み取り専用キーを使うよう PR に明記 | サーバー経由 | Issue の補足どおり。外部ストレージへ移すときに再検討 |
