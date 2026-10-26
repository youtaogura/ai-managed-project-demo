# Issue #4 記録一覧の表示・並び替え・詳細画面

## 背景・目的

記録した作品を一覧で振り返れるようにする。目的に応じて並び替えでき（最近読んだ順、評価の高い順など）、項目をタップすると全項目を確認できる詳細画面を開ける。#2 のデータ層（`RecordRepository`）を画面に接続する最初の Issue。

## スコープ

### やること
- 記録一覧画面: 全記録のリスト表示（サムネイル、タイトル、種別、ステータス、開始日〜終了日、レーティング）
- 並び替え 8 通り（下表）と、選択した並び順の端末内永続化
- 純粋関数の並び替えロジック（日本語・英字混在のタイトル比較を含む）
- サムネイルの優先順位（自分の写真 → 書影 → 種別ごとのプレースホルダー）
- 0 件のときの空状態（案内 + 「追加」への導線）
- 詳細画面: 全項目（感想を含む）の表示、「編集」への導線、「削除」（確認ダイアログ後に実行）
- 一覧に記録を供給する hook（`useRecords`）と、並び順を保持する hook（`useSortOrder`）

### やらないこと
- 種別・ステータスでの絞り込み、キーワード検索（今後の Issue）
- 記録の入力・編集フォーム本体（#3）。本 Issue は #3 のルートへ**遷移するだけ**
- 写真の撮影・選択、書誌取得（#5〜#8）
- 分析画面（#9）

## 受け入れ条件

### 並び替え（`sortRecords` のテスト）
- [ ] 並び順は次の 8 通り。既定は「終了日の新しい順」

  | キー | 表示文言 | 内容 |
  |---|---|---|
  | `endDate_desc` | 終了日が新しい順 | 既定 |
  | `endDate_asc` | 終了日が古い順 | |
  | `startDate_desc` | 開始日が新しい順 | |
  | `startDate_asc` | 開始日が古い順 | |
  | `rating_desc` | 評価が高い順 | |
  | `rating_asc` | 評価が低い順 | |
  | `title_asc` | タイトル順 | 五十音・アルファベット順 |
  | `createdAt_desc` | 登録が新しい順 | |

  （Issue の「登録日時」は新しい順のみ。）
- [ ] 各並び順で期待どおりの順序になる。**同値のときは登録日時（`createdAt`）の新しい順**。`createdAt` も同じ場合は `id` の辞書順で安定させる
- [ ] 開始日・終了日の並び替えで、その日付が `null` の記録は昇順・降順どちらでも末尾に来る
- [ ] レーティング順で、未評価（`null`）の記録は昇順・降順どちらでも末尾に来る
- [ ] タイトル順は `Intl.Collator('ja')` 相当の比較で、ひらがな・カタカナ・漢字・英字が混在しても安定した順序になる（下記「タイトル比較」参照）。`sortRecords` は入力配列を破壊しない
- [ ] 選んだ並び順は再起動後も保持される（storage をインメモリのモックにし、別インスタンスで読み直して確認）。保存値が壊れている・未知の値・読み出し失敗のときは既定（終了日の新しい順）に戻り、例外を出さない

### 一覧表示
- [ ] 記録があるとき、各行にタイトル、種別名（`KIND_LABELS`）、ステータス文言（`getStatusLabel`）、期間、レーティング、サムネイルが表示される
- [ ] 期間の表示: 両方あり `2024-01-05 〜 2024-02-10`、開始のみ `2024-01-05 〜`、終了のみ `〜 2024-02-10`、両方なしは期間を表示しない
- [ ] レーティングは小数第 1 位まで（`4.0` → `★ 4.0`）。未評価は「未評価」と表示する
- [ ] 並び替えコントロールで並び順を変更すると、リストの表示順が即座に変わる
- [ ] サムネイルは `photoUri` があればそれ、なければ `coverUrl`、どちらもなければ種別ごとのプレースホルダーを表示する（優先順位は `getThumbnailSource` の単体テストで 5 種別・各組み合わせを確認）
- [ ] 画像の読み込みに失敗した場合（`onError`）は次の候補にフォールバックし、最終的にプレースホルダーを表示する
- [ ] 読み込み中はインジケーターを表示し、読み込み完了後に一覧（または空状態）に切り替わる
- [ ] 記録が 0 件のとき、空状態（「まだ記録がありません」+ 補足）と「記録を追加する」ボタンを表示する。押すと追加画面（`/records/new`）へ遷移する
- [ ] 一覧に「追加」ボタン（ヘッダー右）があり、押すと `/records/new` へ遷移する（記録が 1 件以上でも使える）
- [ ] 行をタップすると `/records/<id>` の詳細画面へ遷移する

### 詳細画面
- [ ] 詳細画面に全項目が表示される: サムネイル、種別、タイトル、作者・著者など、出版社、ISBN、開始日、終了日、ステータス、レーティング、感想（複数行そのまま）、登録日時、更新日時。値が `null` の項目は「未入力」と表示する（感想は「感想はありません」）。出版社・ISBN は本・漫画以外では行ごと表示しない
- [ ] 「編集」を押すと `/records/<id>/edit` へ遷移する
- [ ] 「削除」を押すと確認ダイアログ（「この記録を削除しますか？」/「キャンセル」「削除」）が出る。「削除」で `repository.delete` が呼ばれ、一覧へ戻る。「キャンセル」では削除されず詳細に留まる
- [ ] 存在しない id（削除済みなど）で開くと「記録が見つかりません」を表示し、一覧へ戻るボタンを出す
- [ ] 削除に失敗（例外）したときは「削除できませんでした」を表示し、画面に留まる
- [ ] 編集後・追加後に一覧へ戻ると最新の内容が表示される（画面がフォーカスされるたびに再読み込みする）

## 画面・振る舞い

### ルート構成
- `(tabs)/index`（記録一覧タブ）: 一覧画面。タブ内にはヘッダー右に「追加」
- `records/[id]`（Stack、タブの外）: 詳細画面。ヘッダー「記録の詳細」、戻るボタンあり
- **`records/new` と `records/[id]/edit` は #3 が実装する**。本 Issue では作らず、`router.push` で遷移するだけ（判断ログ 1）

### 一覧画面
上から: 並び替えバー（現在の並び順を表示する 1 行のボタン。押すと選択肢 8 つのシート/モーダルを開き、選ぶと閉じる）、リスト（`FlatList`）。
行: 左にサムネイル（56×80、角丸）、右にタイトル（最大 2 行）、「種別 ・ ステータス」、期間、レーティング。
状態: `loading` → `ready`（0 件なら空状態）／`error`。

エラー時: `RecordRepository.getAll` は読み出し失敗でも空配列を返す（#2）ため、一覧は実質エラー状態を持たない。`useRecords` は念のため reject も捕捉して空配列にし、例外で画面を落とさない。

### 並び順の保持
`useSortOrder` が起動時に storage から読み、変更時に保存する。読み込み完了までは既定値で描画し、保存値が読めたら切り替える（ちらつきより起動の速さを優先。判断ログ 5）。書き込み失敗は握りつぶす（並び順は UI の好みでありデータ損失ではない。選択自体は画面上は反映される）。

### タイトル比較
`new Intl.Collator('ja', { numeric: true, sensitivity: 'base' })` の `compare` を使う（大文字小文字・かな種別の違いは同値扱い。判断ログ 3）。比較前に `trim` する。同値は共通の同値ルール（`createdAt` 新しい順 → `id`）。
Hermes（Expo の既定エンジン）の `Intl.Collator` は ICU に依存し、環境差の恐れがあるため、テストでは「ひらがな < カタカナ同音 = 同値扱い」「英字 → 日本語」の並びを環境非依存の期待値（英字がかなより前、かな同士は五十音順、漢字は読みの保証はしない＝末尾側）で検証し、漢字の読みによる並びは仕様に含めない。

## 設計

### 追加・変更するファイル

| ファイル | 内容 |
|---|---|
| `src/types/sort.ts` | `SORT_ORDERS`（8 キーの定数配列）、`SortOrder` 型、`DEFAULT_SORT_ORDER = 'endDate_desc'`、型ガード `isSortOrder(value: unknown)` |
| `src/lib/sortRecords.ts` | `sortRecords(records, order): MediaRecord[]`（非破壊）、`SORT_ORDER_LABELS`（キー → 表示文言） |
| `src/lib/thumbnail.ts` | `getThumbnailSource(record): { kind: 'photo' \| 'cover' \| 'placeholder'; uri: string \| null }`、`getThumbnailCandidates(record): string[]`（フォールバック用）、`PLACEHOLDER_LABELS`（種別ごとの絵文字/記号。本 📖、漫画 📚、映画 🎬、ドラマ 📺、アニメ 🎞 など。画像アセットは追加しない） |
| `src/lib/format.ts` | `formatPeriod(start, end)`、`formatRating(rating)`、`formatDateTime(iso)`（`YYYY-MM-DD HH:mm`、ローカル時刻） |
| `src/lib/sortOrderStore.ts` | `createSortOrderStore(storage)`: `load(): Promise<SortOrder>` / `save(order)`。キー `listSortOrder.v1`。壊れた値は既定にフォールバック |
| `src/lib/repository.ts` | アプリ全体で共有する `recordRepository` シングルトン（`createRecordRepository(asyncKeyValueStorage)`）。#3 も同じものを使うこと。#3 が先にマージされて同等のものがあればそれを使う（判断ログ 2） |
| `src/hooks/useRecords.ts` | `useRecords(repository)`: `{ records, loading, reload }`。`useFocusEffect`（expo-router 同梱）でフォーカスのたび再読み込み |
| `src/hooks/useSortOrder.ts` | `useSortOrder(store)`: `[order, setOrder]` |
| `src/components/Thumbnail.tsx` | 候補を順に試して `Image` を表示、失敗でプレースホルダー。`size` prop で一覧/詳細を共用 |
| `src/components/RecordListItem.tsx` | 行コンポーネント（`onPress`） |
| `src/components/SortSelector.tsx` | 並び替えボタン + `Modal` の選択リスト（`accessibilityRole="radio"` 相当で選択状態を表示） |
| `src/screens/RecordsScreen.tsx` | 変更: 一覧・並び替え・空状態・追加導線。依存（`repository` / `sortOrderStore` / `onAdd` / `onOpen`）を props で受け取り、テスト容易にする。デフォルトは本番の実体 |
| `src/screens/RecordDetailScreen.tsx` | 新規: 詳細。`recordId`、`repository`、`onEdit`、`onDeleted`、`onBack` を props で受ける |
| `src/app/(tabs)/index.tsx` | 変更: `RecordsScreen` に `router.push` を配線 |
| `src/app/(tabs)/_layout.tsx` | 変更: 記録一覧のヘッダー右に「追加」 |
| `src/app/records/[id].tsx` | 新規: 詳細ルート（`useLocalSearchParams` で id を取得し `RecordDetailScreen` を描画） |
| `src/app/_layout.tsx` | 変更: `Stack` に `records/[id]` を登録（`headerShown: true`、title「記録の詳細」）。`(tabs)` は `headerShown: false` のまま |
| `src/theme.ts` | 色・余白の追加（`border`, `danger`, `surface` など） |

ルート定義ファイルは Expo Router の仕様上 default export が必須（#2 の判断ログ 2 と同じ例外）。本体は `src/screens/` に named export。

### 状態管理
React の state + hook のみ。データは `useRecords` が保持し、並び替えは**表示時に `sortRecords` を `useMemo` で適用**する（保存順は変えない）。ライブラリ追加なし。

### 削除確認
RN の `Alert.alert` を使う（追加依存なし）。テストでは `jest.spyOn(Alert, 'alert')` で押下されたボタンの `onPress` を呼んで検証する。

### 追加する依存
**なし**。`expo-router`・`@react-native-async-storage/async-storage` は #2 で導入済み。画像は RN 標準の `Image`、プレースホルダーは絵文字（アセット・アイコンパッケージ不要）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 8 通りの並び順・同値ルール・日付/レーティングの null 末尾・非破壊 | `src/lib/__tests__/sortRecords.test.ts`（`it.each` で昇順降順の両方を確認） |
| タイトル比較（かな・カナ・漢字・英字混在） | 同上 |
| 並び順の永続化・壊れた値・失敗時のフォールバック | `src/lib/__tests__/sortOrderStore.test.ts`、`src/hooks/__tests__/useSortOrder.test.tsx` |
| サムネイル優先順位 | `src/lib/__tests__/thumbnail.test.ts`、`src/components/__tests__/Thumbnail.test.tsx`（`onError` フォールバック） |
| 期間・レーティング・日時表示 | `src/lib/__tests__/format.test.ts` |
| 一覧の表示内容・並び替え操作・空状態・追加導線・行タップ遷移・読み込み中 | `src/screens/__tests__/RecordsScreen.test.tsx`（インメモリ repository/storage を props で注入） |
| 並び順が再描画（再マウント）後も維持 | 同上（同じ storage で 2 回 render） |
| 詳細の全項目表示・null の表示・種別による出版社/ISBN の出し分け | `src/screens/__tests__/RecordDetailScreen.test.tsx` |
| 編集遷移・削除確認（実行/キャンセル）・失敗時メッセージ・存在しない id | 同上 |
| ルート配線（一覧 → 詳細 → 戻る、削除後に一覧へ戻る） | `src/__tests__/tabs.test.tsx` を拡張、または `src/__tests__/records-routes.test.tsx` を新設（`renderRouter`。`records/new` と `records/[id]/edit` はダミーのルートを渡して遷移先を確認） |
| 追加後に一覧が最新になる | `useRecords` のフォーカス再読み込みを `src/hooks/__tests__/useRecords.test.tsx` で確認 |

既存の `src/__tests__/tabs.test.tsx` は、一覧が repository を読むようになるため、空の storage を使うよう調整する（テストは削除・減少させない。ケースは維持または増やす）。`RecordsScreen` の既存テスト（`screens.test.tsx`）の「まだ記録がありません」は空状態として引き続き成立させる。

カバレッジ要件（全体 行・関数・文 80% / 分岐 70%、差分 80%）を満たすため、並び替えの分岐（昇順/降順 × null 有無）と表示の分岐（期間・レーティングの有無）を網羅する。jest 設定の変更は不要の想定。

## 判断ログ

1. **#3 との境界: 一覧・詳細・削除は #4、フォームは #3。#4 は `/records/new` と `/records/[id]/edit` へ遷移するだけ**
   - 依存の #3 は未マージで仕様も未確定。Issue 文面上「詳細画面から編集・削除に進める」の削除は詳細画面（#4）で完結させ、編集は #3 のフォームに委ねる。ルート名は慣習的（REST 風）で #3 側が従いやすいものを採用し、衝突を避けるため #4 では作らない。
   - 却下: #4 で仮のフォームルートを作る（#3 とファイル競合する）。`needs_clarification` で #3 の完了を待つ（手戻りは小さく、ルート名はマージ時に調整可能と判断）。
   - 注意: #3 より先にマージされると「追加」「編集」は未定義ルートになる（Expo Router の not-found）。実装担当は PR 本文に、#3 のルートが必要な旨を書くこと。#3 が `records/new` 以外のルート名を採用した場合は、遷移先を 1 か所（`src/app/(tabs)/index.tsx` と `src/app/records/[id].tsx` の `router.push`）で直す。
2. **Repository は 1 つのシングルトンを `src/lib/repository.ts` に置いて共有**。却下: 画面ごとに `createRecordRepository` を作る（書き込み直列化のキューが別になり lost update を防げない）。
3. **タイトル比較は `Intl.Collator('ja', { numeric: true, sensitivity: 'base' })`**。却下: 単純な `localeCompare` 既定（ロケール依存で環境差が出る）、読み仮名フィールドを追加（Issue のスコープ外・入力負担）。漢字の読み順は保証しない（読み仮名データがないため）。この限界は受け入れる。
4. **並び順は 8 通り**（Issue の列挙どおり。「登録日時」は新しい順のみ）。ラベルは「終了日が新しい順」等の自然な日本語にした（文言は推測で決定）。
5. **並び順の保存は専用キー `listSortOrder.v1` に AsyncStorage（`KeyValueStorage` 経由）**。却下: 記録と同じキーに混ぜる（記録配列のスキーマを汚す）。読み込み完了前は既定順で描画する（却下: 読み込み完了までスピナー。体感が悪く、通常は一瞬で切り替わるため）。
6. **null 末尾のルール**: 昇順・降順に関わらず `null` は最後。同値は常に `createdAt` 降順（昇順の並び替えでも同値の順は固定）。
7. **並び替えは表示時に適用**（保存配列は変更しない）。却下: 並び替えた配列を保存（無駄な書き込みと lost update のリスク）。
8. **プレースホルダーは絵文字**（アセット追加・依存追加を避ける）。却下: `@expo/vector-icons`（#2 で導入を見送っており追加依存になる）、画像アセット（レビュー負担が増える）。
9. **削除確認は `Alert.alert`**。却下: 独自モーダル（実装・テストが重い）。Web 対応は要件にない。
10. **一覧のフォーカス再読み込みに `useFocusEffect`**。却下: 画面マウント時のみ読み込み（#3 で追加・編集して戻った際に古い一覧が残る）、グローバルな状態ストア/Context（現時点では過剰）。
11. **詳細ルートは Stack（タブの外）**。タブバーを隠し戻る導線を明確にするため。詳細で `null` 項目を「未入力」と出すのは、項目の抜けとデータの空を区別するため（Issue の「全項目が表示される」を満たす）。
12. **日時表示はローカル時刻の `YYYY-MM-DD HH:mm`**（Hermes の `toLocaleString` は環境差があるため自前整形）。
13. **「追加」の導線は、ヘッダー右ボタン（常時）と空状態のボタンの 2 か所**。Issue は 0 件時の導線のみ明記だが、1 件以上でも追加できないと機能的に不自然なため。
14. **`CLAUDE.md` / jest 設定の変更は不要と判断**。
