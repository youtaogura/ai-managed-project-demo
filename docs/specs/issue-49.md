# Issue #49 設定で、記録する項目（レーティング・ステータス・日付・感想など）を選べるようにする

## 背景・目的

レーティングはいらない、感想は書かない、日付は終えた日だけでいい、など、使いたい項目は人によって違う。使わない項目を入力・表示しないようにして、記録を速く、画面をすっきりさせる。#48 で作った設定画面と設定の保存の仕組みに「記録する項目」の段を足す。

### 現状（コード上の事実）
- `AppSettings = { enabledKinds }` のみ（`types/settings.ts`）。`lib/settingsStore.ts` の `parseSettings` はフィールドごとに検証する。`useSettings()` の `update(patch)` は浅いマージ。`SettingsScreen` に「使う種別」の `SettingsCard` がある。`Toggle` 部品はまだない（デザイン: `docs/design-system/components/Toggle/README.md`）。
- `RecordForm` は写真（`PhotoField`）・種別・タイトル・作者・（出版社・ISBN）・ステータス・開始日／終了日・`RatingInput`・感想を常に出す。`createFormValues` の既定ステータスは `planned`。`applyStatusChange` は `in_progress` で開始日、`completed`/`dropped` で終了日に今日を入れる。`toNewRecordInput` はすべての値を保存する（フォームは編集中の記録の全フィールドを保持している）。
- `RecordDetailScreen`: タイトル下の `RatingStars`、`InfoCellRow`（ステータス・開始・終了）、感想、ヒーローの「写真を変更」ボタン（と `BottomSheet`）。`RecordInfoSection`（作品の情報）の行は種別・作者・出版社・ISBN・登録／更新日時で、今回の項目は含まない。
- `CoverCard`: `thumb` と `hero`。`hero` で `★ 評価` と終了日、`in_progress` なら点（`status-dot`）。
- `SortSheet`: 終了日・開始日・レーティング・タイトル・登録日時。並び順は `useSortOrder`（`sortOrderStore`）に保存、既定 `endDate_desc`。
- `RecordsScreen`: `YearCounter`（`countCompletions` = 終了日が今年・今月）、「最近読み終えた・見終えた」（`recentlyFinished` = 終了日がある記録）。
- `ReviewScreen`: 「この1年で終えた」「平均レーティング」の 2 カード、月別の完了数（`aggregateMonthlyCompletions` = `status==='completed'` かつ終了日の月）、「終了日が未入力の記録 N 件」、レーティング分布、種別ごとの平均。

## スコープ

### やること
1. `AppSettings` に「記録する項目」のオン・オフ（レーティング・ステータス・始めた日・終えた日・感想・写真、初期値はすべてオン）を足し、保存・読み込みできるようにする。
2. 設定画面に「記録する項目」カード（`Toggle` の行 + 補足 + カード下の説明）を足す。`Toggle` 部品を作る。
3. オフの項目を次から外す: 追加・編集フォーム、詳細画面、一覧のカード、並び替えの選択肢（今の並び順がオフの項目なら初期の並び順に戻す）、振り返りのその項目に基づく段。
4. オフの組み合わせ（ステータスがオフ、日付がオフ）でも、記録の追加・保存・一覧・振り返りが壊れないようにする。
5. オフの項目の保存済みの値は消さない（オフの間に編集・保存しても保たれる。オンに戻せば表示される）。

### やらないこと
- 項目の追加・データモデル（`MediaRecord`）の変更
- タイトル・種別・作者・出版社・ISBN のオン・オフ（設定に出さない）
- 書影の自動取得のオフ（「写真」は自分で撮る写真の入力欄だけ。判断ログ 6）
- 振り返りの分析指標の設定
- 「記録するとき（ステータスの初期値）」(#54)、「上に大きく出す作品」(#50)、データ (#55)、このアプリについて (#56) の各カード。ただしこの Issue の設計は、それらが後から設定に足せる形にする
- 新しいライブラリの追加（**追加なし**。`Toggle` は React Native 標準の `Switch` をトークンの色で使う）

## 受け入れ条件

### 設定の保存（`lib/settingsStore.ts` / `hooks/useSettings.tsx`）
- [ ] 保存がないときの設定は、既存の `enabledKinds`（全種別）に加えて、6 項目すべてオン
- [ ] 各項目のオン・オフを変えると保存され、ストアを作り直して（アプリを開き直して）読み込むと同じ設定になる
- [ ] 保存値が壊れている（`enabledFields` がオブジェクトでない、項目の値が真偽値でない）とき、その項目だけ既定値（オン）になる。未知のキーは捨てる。例外で落ちない
- [ ] #48 で保存済みの値（`enabledFields` がない `{ "enabledKinds": [...] }`）を読み込むと、種別はそのまま、項目はすべてオン
- [ ] 項目を変えても `enabledKinds` は変わらない（逆も同じ）

### 設定画面（`SettingsScreen`）
- [ ] 「記録する項目」カードに、レーティング・ステータス・始めた日・終えた日・感想・写真の 6 つのスイッチが、この順に出る。初期値はすべてオン。タイトル・種別・作者・出版社・ISBN は出ない
- [ ] 各スイッチは `switch` の role と、ラベル・オン・オフ（`checked`）の状態を持つ。タップで切り替わり、すぐ保存される。開き直しても保たれる
- [ ] 補足: 「始めた日」「終えた日」の行の下に、種別で変わる言い方（「本・漫画は『読み始めた日』、映画・ドラマ・アニメは『見始めた日』と表示されます」など）を出す。「写真」の行の下に「書影の自動取得はオフになりません」を出す
- [ ] カードの下に「オフにした項目は、入力欄にも表示にも出なくなります。入力済みの内容は消えません。」を出す
- [ ] 「使う種別」カードの挙動（#48）は変わらない。6 項目をすべてオフにできる（最低 1 つの制限はない）

### フォーム（`RecordForm`、追加・編集とも）
- [ ] レーティングがオフ: `RatingInput`（「レーティング」）が出ない
- [ ] ステータスがオフ: 「ステータス」のチップが出ない
- [ ] 始めた日／終えた日がオフ: それぞれの日付ボタンが出ない。両方オフなら日付の行と日付のヒント文も出ない。片方だけオフなら、もう片方だけが（幅いっぱいにせず同じ幅で）出る
- [ ] 感想がオフ: 「感想」欄が出ない
- [ ] 写真がオフ: `PhotoField`（写真の取得ボタンと書影の見本）が出ない。書影の自動取得は今までどおり（保存時の `fillCover`）
- [ ] オフの項目に保存済みの値がある記録を編集・保存しても、その値は変わらない（`onSubmit` に渡る入力のレーティング・ステータス・開始日・終了日・感想・写真 URI が元のまま）
- [ ] オフの項目の値が原因で、保存がエラーになったり、止まったりしない（非表示のフィールドの検証エラーで保存できない状態にならない）
- [ ] ステータスの変更で今日の日付を入れるとき（`applyStatusChange`）、オフの日付の項目は書き換えない（例: 終えた日がオフのとき、「読み終わった」にしても終了日を入れない）

### 新しい記録の既定値
- [ ] ステータスがオンのときは今までどおり（`planned`）
- [ ] ステータスがオフのときは、新しい記録のステータスを `completed`（「読み終わった・見終わった」）で保存する。終えた日がオンなら、終了日に今日を入れた状態でフォームを開く（ユーザーは消せる）。終えた日がオフなら終了日は `null`
- [ ] 検索などから渡された `initialValues.status` があれば、それを優先する（今は渡していないが、上書きしない）
- [ ] 編集では、記録のステータスを変えない（ステータスがオフでも `planned` の記録は `planned` のまま）

### 詳細画面（`RecordDetailScreen`）
- [ ] レーティングがオフ: タイトル下の星・数字が出ない
- [ ] ステータス／始めた日／終えた日がオフ: `InfoCellRow` のそのセルが出ず、残りのセルで並ぶ（セルが 0 個なら `InfoCellRow` ごと出ない）
- [ ] 感想がオフ: 感想の本文が出ない
- [ ] 写真がオフ: ヒーローの「写真を変更」ボタンと、写真の `BottomSheet` が出ない（書影の表示と書影の自動取得はそのまま）
- [ ] 「作品の情報」の行は変わらない（今回の項目を含まないため）
- [ ] オンに戻すと、保存済みの値が再び表示される

### 一覧のカード（`CoverCard`）
- [ ] レーティングがオフ: `hero` の「★ 評価」が出ない
- [ ] 終えた日がオフ: `hero` の終了日が出ない。レーティングも終了日も出ないときは、書影の下の情報の行ごと出ない
- [ ] ステータスがオフ: `in_progress` の点（`status-dot`）が出ない
- [ ] `thumb` は今までどおり（情報を出さない。点だけ上の条件）

### 並び替え（`SortSheet` / `RecordsScreen`）
- [ ] 終えた日がオフ: 「終了日」の行が出ない。始めた日がオフ: 「開始日」の行が出ない。レーティングがオフ: 「レーティング」の行が出ない。「タイトル」「登録日時」は常に出る
- [ ] 保存されている並び順がオフの項目のものなら、一覧は初期の並び順で並び、「すべての記録」の右の並び順の名前も初期の並び順になる。初期の並び順は `endDate_desc`（終えた日がオフのときは `createdAt_desc`）。保存済みの並び順そのものは書き換えない（オンに戻すと元の並び順に戻る）
- [ ] オフにしていない項目の並び順は、そのまま保たれる

### 一覧の集計（`RecordsScreen`）
- [ ] 「完了した日」を次で決める（`lib/completion.ts`）: 終えた日がオンなら `endDate`（今までどおり）。オフなら、`status === 'completed'` の記録の登録日時（`createdAt`）の日付部分（端末のローカル日付 `YYYY-MM-DD`）。完了していない記録は日付なし
- [ ] 「最近読み終えた・見終えた」と `YearCounter` の今年・今月は、「完了した日」で数える・並べる（終えた日がオンのときは今までと同じ結果）
- [ ] 終えた日がオフのとき、「完了した日」のある記録（完了済み）がなければ「最近読み終えた・見終えた」の段を出さない。あれば登録日時の新しい順に出す
- [ ] 記録が 0 件のときの空の状態（#48）は変わらない

### 振り返り（`ReviewScreen`）
- [ ] レーティングがオフ: 「平均レーティング」のカード、「レーティング」の段（分布）、「種別ごとの平均」の段が出ない。「この1年で終えた」のカードは 1 枚で残る（幅いっぱい）
- [ ] 月別の完了数・「この1年で終えた」・期間は「完了した日」で数える。終えた日がオフのとき、「終了日が未入力の記録: N 件」の通知は出さない
- [ ] ステータスがオフでも、月別の完了数は壊れない（新しい記録は `completed` で保存されるため数えられる。数え方は `status === 'completed'` のまま）
- [ ] 日付・ステータスがオフでも、ReviewScreen が例外を出さず、0 件のときの空の状態と同じ条件（使う種別の記録 0 件）で空の状態になる

### オフの項目の値の保持
- [ ] レーティング・ステータス・開始日・終了日・感想・写真 URI のそれぞれについて、項目をオフにしても `RecordRepository` の内容は変わらない（オフ→オンで再表示される）
- [ ] 上の「フォーム」の保存でも値が変わらない

## 画面・振る舞い

### 設定画面（`settings.png` に沿う）
- 「使う種別」カードの下に、同じ `SettingsCard` で「記録する項目」。6 つの `Toggle` 行を縦に並べる。行の高さは 52px 以上で、行全体がタップ領域。行の間は `line` の区切り線。
- 補足は行の下（`micro`・`textTertiary`）。始めた日: 「本・漫画は『読み始めた日』、映画・ドラマ・アニメは『見始めた日』と表示されます」。終えた日: 「本・漫画は『読み終えた日』、映画・ドラマ・アニメは『見終えた日』と表示されます」。写真: 「書影の自動取得はオフになりません」。
- カードの下（カードの外）に説明文「オフにした項目は、入力欄にも表示にも出なくなります。入力済みの内容は消えません。」（`micro`・`textTertiary`）。
- 「記録するとき」「記録一覧」「データ」「このアプリについて」のカードは、後続の Issue がこの後ろに足す。この Issue では置かない。
- タップ → state 更新 → 保存を非同期に発行（保存の完了を待たない、失敗は握りつぶす。#48 と同じ）。

### フォーム
- 行の並び: 写真 → 種別 → タイトル → 作者（・出版社・ISBN）→ ステータス → 日付 → レーティング → 感想。オフの段は飛ばす。
- 日付: 開始・終了のどちらかがオフなら、残る方を同じ列幅（`flex: 1`）で左に置く。両方オフならヒント文（`getDateHint`）も出さない。
- エラー: 非表示の項目のエラーは出さない。`validateForm` は、オフの項目を検証しない（オフ項目に既存値が不正でも保存できる）。
- 保存した記録の項目は `toNewRecordInput` がすべて出力する（オフの値もフォームの `values` に残っている）ので、値は消えない。

### 完了した日
| 終えた日 | 完了した日 |
|---|---|
| オン | `endDate`（`null` なら日付なし） |
| オフ | `status==='completed'` なら `createdAt` のローカル日付、そうでなければ日付なし |

### 並び順の効き方
`effectiveSortOrder(stored, enabledFields)` が一覧の並び・ラベルに使う並び順を返す。保存値は変えない。

## 設計

### 追加・変更するファイル
| ファイル | 内容 |
|---|---|
| `src/types/settings.ts` | `RECORD_FIELDS = ['rating','status','startDate','endDate','review','photo'] as const`、`RecordFieldKey`、`AppSettings.enabledFields: Record<RecordFieldKey, boolean>`、`DEFAULT_SETTINGS.enabledFields`（すべて `true`） |
| `src/lib/settingsStore.ts` | `parseSettings` に `enabledFields` の項目ごとの検証を足す（真偽値でないキーは既定値、未知キーは捨てる）。`defaults()` がコピーを返す（共有オブジェクトを書き換えない） |
| `src/hooks/useSettings.tsx` | 変更なし（`update({ enabledFields })`）。呼び出し側は `{ ...settings.enabledFields, [key]: value }` を渡す |
| `src/components/Toggle.tsx` | 新規。`Toggle({ label, description?, value, onChange })`。`Switch`（`trackColor` オン `colors.accent` / オフ `colors.lineStrong`、`thumbColor` オン `colors.accentInk` / オフ `colors.textTertiary`）。行全体を `Pressable`（`accessibilityRole="switch"`、`accessibilityState={{ checked }}`、`minHeight` 52）にし、中の `Switch` はアクセシビリティから外す（二重読み上げを避ける） |
| `src/screens/SettingsScreen.tsx` | 「記録する項目」カードを足す。行の定義（キー・ラベル・補足）は定数で持つ |
| `src/lib/recordFields.ts` | 新規。`RECORD_FIELD_LABELS`（設定画面用）と、項目に関わる純粋関数（下記） |
| `src/lib/completion.ts` | 新規。`completionDate(record, enabledFields): string \| null`、`localDateString(iso: string): string`（`createdAt` の ISO からローカル日付）。`countCompletions` / `recentlyFinished` / `aggregateMonthlyCompletions` が使う |
| `src/lib/yearCounter.ts` | `countCompletions(records, now, enabledFields?)` / `recentlyFinished(records, limit, enabledFields?)`。省略時はすべてオン（既存テストを壊さない）。日付の取り出しを `completionDate` 経由にする |
| `src/lib/analytics.ts` | `aggregateMonthlyCompletions(records, now, enabledFields?)`。`record.endDate` を `completionDate` に置き換え。終えた日がオフのとき `undatedCompleted` は 0 |
| `src/lib/recordForm.ts` | `applyStatusChange(values, status, today, enabledFields?)`: オフの日付は書き換えない。`validateForm(values, enabledFields?)`: オフの項目（rating・startDate・endDate）は検証しない。`createFormValues` は変えない |
| `src/components/RecordForm.tsx` | `useSettings()` の `enabledFields` で各段を出し分ける。`validateForm`・`applyStatusChange` に渡す。日付の行の出し分け |
| `src/screens/RecordFormScreen.tsx` | 新規作成の分岐で、`initialValues` に `newRecordDefaults(enabledFields, today)` をマージ（呼び出し側の値を優先）。編集の分岐は変更しない |
| `src/screens/RecordDetailScreen.tsx` | 星・`InfoCell`・感想・「写真を変更」ボタンと `BottomSheet` を出し分ける。`InfoCellRow` は子が 0 個なら出さない |
| `src/components/CoverCard.tsx` | `useSettings()` で `rating` `endDate` `status` を見て出し分ける |
| `src/components/SortSheet.tsx` | `SORT_FIELDS` に `requires?: RecordFieldKey` を足し、オフの項目の行を出さない。`useSettings()` を読む |
| `src/lib/sortRecords.ts` / `src/types/sort.ts` | `effectiveSortOrder(order, enabledFields): SortOrder`（`sortRecords` の外。`types/sort.ts` に置いてよい）。`SORT_ORDER_REQUIRES: Partial<Record<SortOrder, RecordFieldKey>>`（`endDate_*` → `endDate`、`startDate_*` → `startDate`、`rating_*` → `rating`） |
| `src/screens/RecordsScreen.tsx` | `effectiveSortOrder` で並べ、ラベルも同じ値。`countCompletions` `recentlyFinished` に `enabledFields` を渡す。`SortSheet` の `value` も実効値 |
| `src/screens/ReviewScreen.tsx` | 上の受け入れ条件どおりに出し分け。`aggregateMonthlyCompletions` に `enabledFields` を渡す |
| `src/testProviders.tsx` | `withSettings` が項目の初期値を受け取れるようにする（既にあれば引数を足す） |

### `lib/recordFields.ts` の関数
- `newRecordDefaults(enabledFields, today): Partial<NewRecordInput>` … ステータスがオフなら `{ status: 'completed', endDate: enabledFields.endDate ? today : null }`、オンなら `{}`
- `withFieldToggled(enabledFields, key, value): Record<RecordFieldKey, boolean>`（設定画面用）

### 状態管理・データ構造
- 設定は #48 の Context。ライブラリ追加なし。
- `useSettings().update({ enabledFields: next })` で項目全体を渡す（浅いマージなので、キーを欠かさない）。
- 保存形式（`appSettings.v1`、キーのバージョンは上げない。足したフィールドは欠けていても既定値で読める）:
```ts
{ "enabledKinds": ["book"], "enabledFields": { "rating": true, "status": false, "startDate": true, "endDate": true, "review": true, "photo": true } }
```
- 並び順は `useSortOrder`（独立したストア）のまま。実効値は表示時に計算する。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 既定値・壊れた値・#48 の保存値・項目ごとの検証・種別との独立 | `lib/__tests__/settingsStore.test.ts` |
| 保存→作り直して読み込み | `hooks/__tests__/useSettings.test.tsx` |
| `completionDate`（オン/オフ、完了・未完了、ローカル日付） | `lib/__tests__/completion.test.ts` |
| `countCompletions` `recentlyFinished` `aggregateMonthlyCompletions` の終えた日オフ | `lib/__tests__/yearCounter.test.ts` `analytics.test.ts` |
| `applyStatusChange` `validateForm` `newRecordDefaults` `effectiveSortOrder` | `lib/__tests__/recordForm.test.ts`、`recordFields.test.ts`、`sortRecords.test.ts` |
| `Toggle` の role・状態・タップ | `components/__tests__/Toggle.test.tsx` |
| 設定画面の 6 つのスイッチ・保存・開き直し・補足・説明 | `screens/__tests__/SettingsScreen.test.tsx` |
| フォームの項目ごとの出し分け・日付の片方オフ・オフ項目の値が保存で保たれる・非表示の項目が検証で止めない | `components/__tests__/RecordForm.test.tsx` |
| 新しい記録の既定ステータス（ステータスオフ・終えた日の有無）、編集で変わらない | `screens/__tests__/RecordFormScreen.test.tsx` |
| 詳細の項目ごとの出し分け・`InfoCellRow` の詰め・写真ボタン | `screens/__tests__/RecordDetailScreen.test.tsx` |
| カードの項目ごとの出し分け | `components/__tests__/CoverCard.test.tsx` |
| 並び替えの行の出し分け・保存済み並び順がオフ項目のとき初期に戻る・オンに戻すと元の並び順 | `components/__tests__/SortSheet.test.tsx`、`screens/__tests__/RecordsScreen.test.tsx` |
| 一覧の集計・最近の段（終えた日オフ） | `screens/__tests__/RecordsScreen.test.tsx` |
| 振り返りの段の出し分け・通知・空状態 | `screens/__tests__/ReviewScreen.test.tsx` |

`withSettings` で設定を注入して検証する。既存のテストは Provider なし（全項目オン）で通ること。振る舞い（表示・操作結果）で検証し、内部構造に依存しない。変更行カバレッジ 80% 以上。

## 判断ログ

1. **設定のデータ構造: `enabledFields: Record<RecordFieldKey, boolean>`**
   - 選んだ案: 項目ごとの真偽値のオブジェクト。キーを定数で持ち、検証・画面・テストで共有できる。
   - 却下: 「オフの項目の配列」（#48 の `enabledKinds` と逆向きで、既定値＝空配列は分かりにくい）。項目ごとのトップレベルのフィールド（#50・#54 の設定と並び、`parseSettings` が散らかる）。
2. **保存キーのバージョンは上げない（`appSettings.v1` のまま）**: フィールドを足すだけで、`enabledFields` がなくても既定値で読めるため。互換のない変更ではない。
3. **Toggle は標準の `Switch` を使う**: ライブラリ追加なし。デザインの色指定（`trackColor` など）に合わせられる。行全体のタップは `Pressable` で作り、読み上げは行に 1 回（`role=switch`）。却下: 独自のアニメーション付きスイッチ（動きを減らす設定への対応など作り込みが増える）。
4. **ステータスがオフのときの新しい記録: `completed` で保存**（Issue の例どおり）。終えた日がオンなら終了日に今日を入れた状態でフォームを開く（ステータスの初期値 #54 の「読み終わった」と同じ振る舞い）。却下: `planned` のまま（一覧の「最近読み終えた」に出ず、振り返りの完了数にも入らない）、終了日を保存時に黙って入れる（フォームに見えない値が入る）。編集では既存のステータスを変えない。
5. **日付がオフのときの「完了した日」: 終えた日がオフなら、完了済みの記録の登録日時で数える**（Issue の例の「登録日時で代える」）。却下: その段を出さない（一覧のトップが空になり、日付を使わない人ほど何も出ない）。始めた日のオフは、完了の数え方に影響しないので何もしない。終えた日がオンで終了日がない記録は今までどおり「日付なし」。
6. **「写真」のオフは入力欄だけ**: Issue どおり書影の取得はオフにしない。詳細・一覧に表示する書影・写真（`Cover`）は、保存済みの `photoUri` があればそのまま表示する（表紙そのものなので、オフにして表紙が変わると、オンに戻すまで別の画像に見える混乱が大きい）。却下: オフの間は `photoUri` を無視して書影・文字の表紙を出す（全 `Cover` の呼び出しに設定を通す変更が必要で、設定の意味も「表示から消す」になり Issue の「自分で撮る写真の欄だけ」と食い違う）。
7. **並び順がオフの項目のとき: 保存値は書き換えず、表示・並びだけ初期の並び順にする**（`effectiveSortOrder`）。Issue の「初期の並び順に戻す」を満たしつつ、オンに戻せば元の並び順に戻る（値を消さない方針に合わせる）。初期の並び順は `endDate_desc`、終えた日がオフのときは `createdAt_desc`（`endDate_desc` 自体が使えないため）。却下: 保存値を書き込んで戻す（オフ→オンで元の並びを失う）。
8. **ステータスがオフのとき、振り返り・一覧は段を隠さない**: 完了数は `status==='completed'` に基づくが、新しい記録は `completed` で保存されるので意味が保たれる。ステータスに「基づく段」を隠すと一覧と振り返りがほとんど空になる。ただし以前に `planned` などで保存した記録は引き続き数えない（保存済みの値は消さない・読み替えない）。
9. **レーティングがオフのとき、振り返りの「平均レーティング」カードも隠す**（Issue の「その項目に基づく段」）。残る「この1年で終えた」は幅いっぱいにする。
10. **非表示のフィールドは検証しない**: 既存値が不正（手動編集など）でも、見えない理由で保存が止まらないようにする。新規入力ではオフの項目は初期値（空）のまま。
11. **`applyStatusChange` はオフの日付を書き換えない**: 見えない値が増えない。
12. **詳細の `InfoCellRow` は子が 0 個なら出さない**: 空の行の余白を出さないため。
13. **「作品の情報」は変えない**: 今回の 6 項目は含まれていない。
14. **新しいトークン・色・ライブラリの追加なし**。区切り線は `colors.line`、`Toggle` の寸法（51×31・つまみ 25）は `Switch` の標準の大きさに任せる（標準の `Switch` を使う場合も色だけ合わせる、というデザイン README の方針）。独自寸法が必要になったら実装工程の判断ログに書く。
15. **#48 の「使う種別」カードとの関係**: 独立した設定。最低 1 つ必須の制限は種別だけで、項目は全部オフにできる（ユーザーの自由。タイトル等の必須項目だけで記録できる）。
