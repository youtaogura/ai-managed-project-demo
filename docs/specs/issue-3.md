# Issue #3 記録の手入力・編集・削除

## 背景・目的

ISBN がない本や、映画・ドラマ・アニメなど書籍以外も記録できるように、すべての項目を手入力して記録を作成・編集・削除できるようにする。
後続の ISBN 検索・バーコード・タイトル検索（#5〜#7）は、このフォームに初期値を渡す形で使う。依存: #2（`RecordRepository`・検証関数・`getStatusLabel`・Expo Router のタブ）。

## スコープ

### やること
- 記録フォーム画面（新規作成・編集の共用）。項目: 種別、タイトル、作者・著者など、出版社、ISBN、開始日、終了日、ステータス、感想、レーティング
- 記録一覧からの「追加」導線、既存記録の編集・削除（削除は確認ダイアログ後）
- フォームが外部から初期値（タイトル・著者・出版社・ISBN・書影 URL など）を受け取れる作り
- フォームの入力値 ⇔ `NewRecordInput` の変換と、画面向けバリデーション（エラーメッセージ付き）
- Repository を画面から使うための hook / context

### やらないこと
- ISBN 自動入力・バーコード・タイトル検索、写真の撮影・選択（別 Issue）。`coverUrl` / `photoUri` はフォームに入力欄を出さず、初期値・既存値を保持して保存時にそのまま書き戻す
- 一覧の本格的な表示（並び替え・絞り込み・書影表示など。#4）。本 Issue では編集に到達するための最小の一覧（タイトル・種別・ステータス）のみ

## 受け入れ条件

- [ ] タイトルが空（空白のみを含む）のとき保存できず、「タイトルを入力してください」が表示される。Repository の `add` / `update` は呼ばれない
- [ ] 新規作成時、開始日・終了日はどちらも空。それぞれ入力・変更・クリアできる
- [ ] ステータスを「読んでる / 見てる」（`in_progress`）にしたとき開始日が空なら今日（`YYYY-MM-DD`、端末ローカル日付）が入る。「読み終わった / 見終わった」（`completed`）または「途中でやめた」（`dropped`）にしたとき終了日が空なら今日が入る。入っている場合は上書きしない。自動で入った日付も後から変更・クリアできる
- [ ] 開始日・終了日の両方があり終了日が開始日より前のとき保存できず、「終了日は開始日以降にしてください」が表示される
- [ ] 日付が `YYYY-MM-DD` として実在しない（`2024-02-30`、形式違い）とき保存できず、「日付は YYYY-MM-DD の形式で入力してください」が表示される
- [ ] ステータスの選択肢の文言が種別に応じて切り替わる（本・漫画: 読みたい/読んでる/途中でやめた/読み終わった、映画・ドラマ・アニメ: 見たい/見てる/途中でやめた/見終わった）。種別変更でステータスの内部値は維持され、表示だけ変わる
- [ ] レーティングは未入力でも保存でき `rating: null` になる。1.0〜5.0・小数第 1 位までの値は保存できる。範囲外（0.9, 5.1）や小数第 2 位以上（3.25）、数値でない入力では「レーティングは 1.0〜5.0 の範囲で、小数第1位まで入力してください」が表示され保存されない
- [ ] 種別が本・漫画以外（映画・ドラマ・アニメ）のとき ISBN・出版社の入力欄は表示しない。本・漫画では表示する。映画等へ切り替えて保存した場合、`isbn` / `publisher` は `null` で保存する
- [ ] 新規保存すると `RecordRepository.add` が呼ばれ、入力値が `NewRecordInput` として保存され、保存後に前の画面へ戻る
- [ ] 編集画面は既存記録の値が入力済みの状態で開く。保存すると `update(id, …)` が呼ばれ、`coverUrl` / `photoUri` は既存値を維持する。存在しない id では「記録が見つかりません」を表示する
- [ ] 削除ボタン（編集時のみ表示）を押すと確認ダイアログが出る。「削除」を選ぶと `delete(id)` が呼ばれ前の画面へ戻る。「キャンセル」では `delete` は呼ばれず画面に留まる
- [ ] 初期値（`initialValues`）を渡してフォームを開くと、その値が入力済みになっている（種別・タイトル・作者・出版社・ISBN・書影 URL など）。書影 URL は表示されないが保存時に含まれる
- [ ] 保存・削除が例外で失敗したら「保存に失敗しました」/「削除に失敗しました」を表示し、画面に留まる（入力値は保持）
- [ ] 記録一覧に「追加」ボタンがあり、押すと新規フォームに遷移する。記録があれば行を表示し、押すと編集画面に遷移する

## 画面・振る舞い

### 記録一覧（`/`、タブ）
- ヘッダ右または一覧上部に「追加」ボタン → `/record/new`
- 記録 0 件: 既存の空状態（「まだ記録がありません」）。1 件以上: 行（タイトル / 「種別 ・ ステータス文言」）を `createdAt` 降順で表示。行タップで `/record/<id>`
- 画面フォーカス時に再読み込みして保存結果を反映する

### 記録フォーム（`/record/new`、`/record/[id]`。スタック上の通常画面）
上から順に（スクロール可）:
1. 種別（セグメント: 本 / 漫画 / 映画 / ドラマ / アニメ。初期値は `initialValues.kind` または `book`）
2. タイトル（必須）
3. 作者・著者など（ラベルは種別で「著者」「作者」「監督」等に変えず、固定で「作者・著者・監督など」）
4. 出版社・ISBN（本・漫画のみ）
5. ステータス（セグメント 4 択。初期値 `planned`）
6. 開始日 / 終了日（それぞれ テキスト入力 `YYYY-MM-DD` + 「今日」ボタン + 「クリア」ボタン）
7. レーティング（下記）
8. 感想（複数行）
9. 「保存」ボタン、編集時のみ「削除」ボタン（破壊的操作の色）

- エラーは該当項目の直下に赤字で表示。「保存」押下時に全項目を検証し、エラーがあれば保存しない。入力の修正でその項目のエラーは消える
- 保存中はボタンを無効化（二重送信防止）
- ステータス自動日付: ステータスを**変更したとき**だけ適用（初期表示時、編集で開いた直後には適用しない）。`in_progress` → 開始日が空なら今日。`completed` / `dropped` → 終了日が空なら今日

### レーティング入力方式
- 採用: **数値入力（`decimal-pad` キーボード）＋ステッパー（− / ＋ ボタンで 0.1 刻み）＋「クリア」**。
  - 直接入力でき（例 `3.7`）、微調整はステッパーで 1 タップ。未入力が許される項目なので入力欄は空にできる。
  - ステッパー: 空のとき「＋」で 3.0 から開始、1.0 で「−」、5.0 で「＋」は無効。計算は整数（×10）で行い浮動小数誤差を避ける（`Math.round(v * 10 ± 1) / 10`）。入力欄の表示は `toFixed(1)`
- 文字列 → 数値の変換（`parseRating`）: 全角数字・全角ピリオドは半角へ正規化、前後空白は無視、空文字は `null`、数値として解釈できなければ無効

## 設計

### 追加・変更するファイル（すべて `app/` 配下）

| ファイル | 内容 |
|---|---|
| `src/lib/recordForm.ts` | フォーム値の型 `RecordFormValues`（全項目が文字列、`kind` / `status` のみ列挙値、`coverUrl` / `photoUri` は `string \| null` で保持）、`createFormValues(initial?: Partial<NewRecordInput>)`、`recordToFormValues(record)`、`validateForm(values): RecordFormErrors`（項目ごとのエラー文言）、`toNewRecordInput(values): NewRecordInput`（trim・空文字→`null`・本/漫画以外は `isbn` / `publisher` を `null`・rating 変換）、`parseRating(text)`、`stepRating(text, delta)`、`applyStatusChange(values, status, today)`（自動日付）、`todayString(date = new Date())`（ローカル日付 `YYYY-MM-DD`）。日付・レーティングの判定は `validation.ts` の `isValidDateString` / `isValidRating` を再利用 |
| `src/components/RecordForm.tsx` | フォーム UI。props: `initialValues?: Partial<NewRecordInput>`、`submitLabel?`、`onSubmit(input: NewRecordInput): Promise<void>`、`onDelete?(): Promise<void>`（あれば削除ボタンを表示し、押下時に `Alert.alert` で確認）。内部 state は `RecordFormValues` と `errors`。保存失敗は `onSubmit` の reject を捕捉してメッセージ表示 |
| `src/components/SegmentedControl.tsx` | 種別・ステータス用の選択肢ボタン群（`accessibilityRole="radio"` と `selected` 状態を付与しテストしやすくする） |
| `src/components/RatingInput.tsx` | 上記レーティング入力（`value: string`, `onChange(text)`, `error?`） |
| `src/components/DateField.tsx` | ラベル・テキスト入力・「今日」「クリア」ボタン・エラー表示 |
| `src/hooks/useRecordRepository.tsx` | `RecordRepositoryProvider`（context）と `useRecordRepository()`。Provider の既定値は `createRecordRepository(asyncKeyValueStorage)`、テストでは `repository` prop でインメモリ実装を注入 |
| `src/hooks/useRecords.ts` | 一覧用。`useRecords()` → `{ records, loading, reload }`。`useFocusEffect`（expo-router）で再読み込み |
| `src/screens/RecordFormScreen.tsx` | `RecordFormScreen({ recordId?, initialValues? })`。`recordId` があれば `getAll()` から該当記録を探して編集モード（見つからなければ「記録が見つかりません」）。保存後 `router.back()`。ロード中は `ActivityIndicator` |
| `src/screens/RecordsScreen.tsx`（変更） | 「追加」ボタンと最小の一覧行。0 件のときは既存 `EmptyState` |
| `src/app/_layout.tsx`（変更） | `RecordRepositoryProvider` で包む。Stack に `record/new`（タイトル「記録を追加」）、`record/[id]`（「記録を編集」）を `headerShown: true` で登録 |
| `src/app/record/new.tsx` / `src/app/record/[id].tsx` | 薄いルート。`new` は `useLocalSearchParams` の `title` / `creator` / `publisher` / `isbn` / `coverUrl` / `kind`（すべて任意の文字列）を型ガードで絞って `initialValues` に渡す（#5〜#7 が `router.push({ pathname: '/record/new', params })` で使えるようにする）。`[id]` は `id` を渡す |
| `src/theme.ts`（変更） | `danger`・`border`・`inputBackground` 等の色を追加 |

ルートファイルは Expo Router の仕様で default export 必須（#2 の判断ログ 2 と同じ例外）。

### データ構造・状態管理
- `NewRecordInput`（#2）をそのまま使う。データモデルの変更なし。
- フォームの入力途中の値は文字列で持つ（数値入力の途中状態 `3.` などを許容するため）。保存時に `toNewRecordInput` で変換。
- 状態管理は React の state + context（Repository の注入のみ）。ライブラリ追加なし。

### 追加する依存
**なし**。日付はテキスト入力 + 「今日」ボタンで実現し、日付ピッカーのライブラリは入れない（下記判断ログ 2）。確認ダイアログは React Native 標準の `Alert`、遷移は導入済みの `expo-router` を使う。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| タイトル空・日付形式・日付逆転・レーティング範囲/桁/非数のエラー、`toNewRecordInput` 変換（空→`null`、trim、本/漫画以外で isbn/publisher を null）、`parseRating`（全角・空・不正）、`stepRating`（空から 3.0、上下限、0.1 刻みの誤差なし）、`applyStatusChange`（自動日付・既存日付を上書きしない）、`todayString` | `src/lib/__tests__/recordForm.test.ts`（純粋関数。分岐を網羅） |
| フォーム UI（エラー表示、日付の入力・クリア・「今日」、ステータス変更での自動日付、種別でステータス文言・ISBN/出版社の表示切替、レーティング入力とステッパー、初期値の反映、`onSubmit` に渡る値、保存失敗メッセージ、削除の確認で「削除」/「キャンセル」） | `src/components/__tests__/RecordForm.test.tsx`（`Alert.alert` を `jest.spyOn` で差し替え、ボタンの `onPress` を手動で呼ぶ。日時は `jest.useFakeTimers().setSystemTime` で固定） |
| 新規保存で `add` 呼び出し・戻る、編集で既存値が入る・`update` 呼び出し・`coverUrl` / `photoUri` 維持、存在しない id、削除で `delete` と戻る/キャンセル、初期値反映 | `src/screens/__tests__/RecordFormScreen.test.tsx`（インメモリ Repository を Provider で注入、`expo-router` の `router` は `jest.mock`） |
| 一覧の追加ボタン・行表示・編集への遷移・0 件の空状態 | `src/screens/__tests__/RecordsScreen.test.tsx`（既存 `screens.test.tsx` の RecordsScreen テストは Provider 付きに更新。ケース数は減らさない） |
| ルーティング（追加→フォーム→保存→一覧に反映） | `src/__tests__/tabs.test.tsx` に統合ケースを追加（`renderRouter`、インメモリ Repository）。難しい場合は画面単体テストで代替し判断ログに残す |

差分カバレッジ 80% のため、`RecordForm` / `recordForm.ts` の分岐はテストで網羅する。jest 設定・CI 設定は変更しない。

## 判断ログ

1. **レーティング入力: 数値入力 + ±0.1 ステッパー + クリア を採用**
   - 却下: スライダー（0.1 刻みは親指で正確に合わせにくく、未入力状態も表せない・追加ライブラリが必要）、星タップ（0.5 刻みが限界）、ステッパーのみ（3.7 に着くまで何度も押す）、数値入力のみ（微調整しにくい）。
2. **日付入力: テキスト（`YYYY-MM-DD`）+「今日」「クリア」ボタン。日付ピッカーは導入しない**
   - 理由: Issue は「入力・変更・クリア」を求める。ネイティブのピッカー（`@react-native-community/datetimepicker`）は「未設定」を表現しづらく、追加依存と Jest でのモックが必要。#2 の検証（`isValidDateString`）をそのまま使える。
   - 却下: ピッカー導入（依存追加・テスト困難）。入力しやすさに課題が出たら別 Issue でピッカーを足す。
3. **ステータス自動日付は「ステータスを変更した時」だけ適用**。初期表示や編集で開いた直後は適用しない（既存記録の日付が勝手に変わるのを避ける）。既に日付がある場合は上書きしない。ステータスを戻しても自動で入れた日付は消さない（Issue に消す指定がなく、ユーザーがクリアできるため）。
4. **「今日」は端末ローカルの日付**（`toISOString()` は UTC で日付がずれるため不使用）。
5. **種別を映画等に切り替えたとき、入力済みの ISBN・出版社は画面上は隠すが、フォーム state には残す**（誤って種別を触っても本に戻せば復活）。保存時のみ `null` にする。
6. **種別変更時、ステータスの内部値は維持**（#2 の判断ログ 3 のとおり内部値は種別非依存）。
7. **`coverUrl` / `photoUri` はフォームに欄を出さず保持のみ**。初期値で渡された書影 URL・編集時の既存値を失わないため。写真は #8 が扱う。
8. **記録フォームは Expo Router のスタック画面（`/record/new`、`/record/[id]`）**。却下: モーダル表示（Android・Web での挙動差が増え、テストも複雑になる）。初期値は route params（文字列）で受けられるようにし、コンポーネント自体は props `initialValues` で受ける（後続 Issue が画面遷移でも直接埋め込みでも使える）。
9. **最小の一覧を本 Issue に含める**。編集・削除に到達する手段が一覧しかなく、これがないと機能が使えないため。見た目・並び替え・絞り込みは #4 が置き換える前提で、行は最小限（タイトル・種別・ステータス）。
10. **エラーメッセージは項目の直下に表示し、保存時に全項目を一括検証**。保存の最終防衛線として Repository の `ValidationError` も捕捉して「保存に失敗しました」とする。
11. **Repository は context で注入**（hook `useRecordRepository`）。グローバルシングルトンの直接 import は却下（テストで差し替えにくい）。
12. **削除確認は `Alert.alert`**（「この記録を削除しますか？」/「削除」「キャンセル」）。標準 API で依存なし。ボタン文言は推測で決定。
13. **作者欄のラベルは固定の「作者・著者・監督など」**（Issue のフォーム項目の表記に合わせる。種別ごとの文言切替は過剰）。
14. **CLAUDE.md・jest 設定・CI 設定の変更は不要と判断**。
