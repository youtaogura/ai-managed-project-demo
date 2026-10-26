# Issue #25 レーティングを星アイコンのドラッグで入力できるようにする

## 背景・目的

現在のレーティング入力（`RatingInput`）は、数値のテキスト入力と ±0.1 ボタンで、直感的に操作しにくい。5 つの星を指でなぞる（ドラッグ）かタップするだけで評価を付けられるようにする。保存データの形式は変えない。

## スコープ

### やること
- `RatingInput` を、5 つの星による入力に置き換える（部分塗り対応）
- ドラッグ・タップで 0.1 刻み（1.0〜5.0）の評価を連続的に設定する
- 現在値の数値表示（「3.7」／未評価は「未評価」）、「クリア」、アクセシビリティ（adjustable）による ±0.1
- 位置→評価、評価→各星の塗り割合を純粋関数として `src/lib/recordForm.ts` に追加する

### やらないこと
- 記録一覧・詳細画面での星表示
- 刻み（0.1）の変更
- 保存形式・バリデーション・`RecordForm` の値形式（`rating: string`）の変更
- 依存追加（なし）

## 受け入れ条件

- [ ] `ratingFromPosition(x, width)`: 幅 200 で x=148→3.7、x=0→1.0、x=200→5.0、x=-10→1.0、x=260→5.0。width が 0 以下のときは 1.0 を返さず `null`（変更なし扱い）
- [ ] `starFills(rating)`: 3.7→[1,1,1,0.7,0]、null→[0,0,0,0,0]、5→すべて 1、1→[1,0,0,0,0]
- [ ] 星をタップすると、その位置の評価がフォームの値になる
- [ ] ドラッグ中は値と星の塗りがリアルタイムに更新され、離した時点の値が保存される
- [ ] 星の上のタッチは親 ScrollView にスクロールを奪われない（responder 終了要求を拒否）。星の外では従来どおりスクロールできる
- [ ] 数値表示が「3.7」、未評価は「未評価」
- [ ] 「クリア」で未評価に戻り、未評価のまま保存できる（`rating: null`）
- [ ] 編集時、保存済みの評価（例 3.7）が星と数値で表示される
- [ ] 星は accessibilityRole `adjustable`、label「レーティング」、value text「3.7」（未評価は「未評価」）。`accessibilityActions` の increment/decrement で ±0.1（未評価で increment→3.0、範囲 1.0〜5.0 でクランプ）
- [ ] 保存データは数値・1.0〜5.0・小数第 1 位・未評価 null のまま
- [ ] `pnpm check` が通る

## 画面・振る舞い

- 「レーティング」ラベルの下に、星の行（`★` 5 つ、幅 = 5 × 星サイズ）と、右に数値表示、さらに「クリア」ボタン。
- 星の行の左端を x=0、幅 W として、タッチ位置 x（`locationX`）を `ratingFromPosition(x, W)` で評価に変換する。
- タッチ開始（grant）で即値を更新、移動（move）で更新、離す（release）で最終値を確定。値の更新は `onChange(formatRating(v))` を各イベントで呼ぶ（親の state が単一の情報源。離した時点の値がそのまま残る）。同値の場合は `onChange` を呼ばない。
- 未評価から開始してドラッグ開始すると、触れた位置の値になる（最小 1.0）。
- バリデーションエラー（`error`）は従来どおり下に赤字表示。星入力では範囲外にならないが、`value` が不正な文字列（外部からの初期値）の場合は未評価として星を描画し、エラー表示は維持する。
- スクリーンリーダー: 星の行は `accessible` + `accessibilityRole="adjustable"` + `accessibilityLabel="レーティング"` + `accessibilityValue={{ text }}` + `accessibilityActions`（increment / decrement）。

## 設計

### 追加・変更ファイル
- `app/src/lib/recordForm.ts`: `ratingFromPosition(x: number, width: number): number | null`、`starFills(rating: number | null): number[]` を追加。0.1 丸めは `Math.round(ratio * 5 * 10) / 10` を `Math.min(5, Math.max(1, …))`。
- `app/src/components/RatingInput.tsx`: 全面書き換え。TextInput と ± ボタンを削除。
- `app/src/components/StarRating.tsx`（新規、必要なら分離）: 星の描画のみ（props: `fills: number[]`, `size`）。
- `app/src/theme.ts`: 星の色（塗り・空）、星サイズ定数を追加。
- テスト: `src/lib/__tests__/recordForm.test.ts`（純粋関数）、`src/components/__tests__/RecordForm.test.tsx`（既存の TextInput／±ボタン前提のテストを星前提に更新）、必要なら `RatingInput.test.tsx`。

### 状態管理
`RecordForm` の `values.rating: string` は維持。`RatingInput` の props（`value`, `error`, `onChange(text)`）も維持するので `RecordForm` は変更不要。ドラッグ中の一時状態は持たず、イベントごとに `onChange` する。

### ドラッグ実装
React Native 標準の `PanResponder` を使う。`onStartShouldSetPanResponder: () => true`、`onMoveShouldSetPanResponder: () => true`、`onPanResponderTerminationRequest: () => false`。星の行 View が responder になりタッチを保持するため、親 ScrollView は星上のドラッグでスクロールしない。位置は grant 時の `nativeEvent.locationX` と、以降は `gestureState.dx` を加算して算出する（move 中の `locationX` は子 Text にヒットすると相対位置がずれるため。星の Text は `pointerEvents="none"` にして子ヒットも避ける）。幅は `onLayout` で取得。

### 星の描画
文字の `★` を重ねる方式。下層に空の星（淡色）5 つ、上層に塗り色の星 5 つを `overflow: hidden` の各セル内に置き、各セルの幅を `size × fill` にして部分塗りを表現する。SVG（`react-native-svg`）は依存追加が要るため採用しない。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 位置→評価、width 不正 | `recordForm.test.ts`（純粋関数、境界値含む） |
| 塗り割合 | `recordForm.test.ts` |
| タップ・ドラッグ・離す | `RecordForm.test.tsx`: 星の行（label「レーティング」）に `onLayout`（幅 200）を発火し、`responderGrant` / `responderMove` / `responderRelease` のタッチイベントを模擬。保存して `onSubmit` の `rating` を確認 |
| スクロール非奪取 | `onResponderTerminationRequest` が false を返すことを確認 |
| 数値表示／未評価 | `RecordForm.test.tsx`（テキストの表示） |
| クリア・未評価保存 | `RecordForm.test.tsx` |
| 編集時の初期表示 | `RecordForm.test.tsx`（`initialValues.rating=3.7` → 「3.7」表示、塗り割合） |
| adjustable ±0.1 | `RecordForm.test.tsx`（`accessibilityActions` の increment/decrement を発火） |

既存テストのうち、`getByLabelText('レーティング')` の TextInput 前提、`type('レーティング', …)`、「レーティングを上げる／下げる」ボタン前提の箇所は星入力前提に書き換える（削除ではなく、同等の振る舞い検証に置き換えてテスト数を減らさない）。

## 判断ログ

- **ドラッグ実装: PanResponder を採用**。却下: `react-native-gesture-handler`（依存追加、Expo Router 経由で既に入っている可能性はあるが、単一コンポーネントの水平ドラッグには過剰。Jest でのイベント模擬も標準の方が容易）。
- **星の描画: `★` 文字 + 幅クリップ**。却下: `react-native-svg`（依存追加）、画像アセット（部分塗りが難しい）。
- **スクロール競合: responder を握って終了要求を拒否**。却下: ドラッグ中に `scrollEnabled` を切り替える方式（親へコールバックが必要で `RecordForm` の変更が増える）。
- **値の更新: ドラッグ中も毎回 `onChange`**。却下: 離した時にだけ確定（リアルタイム表示を別 state で持つ必要があり、二重管理になる）。
- **テキスト入力と ± ボタンは削除**。Issue に「置き換える」とあるため。±0.1 はアクセシビリティ操作で提供する。
- **未評価で increment は 3.0**: 現行の `stepRating` の挙動を踏襲（`stepRating` を再利用）。decrement は未評価のままなにもしない。
- **位置の割合 → 評価で左端が 1.0**: Issue の指定どおり（0 は選べず、未評価に戻すのは「クリア」）。
- **width が 0 以下は `null`**: レイアウト前のタッチで NaN/Infinity を出さないため。呼び出し側は null のとき何もしない。
- **#8（写真）とのコンフリクト**: `RecordForm` は変更しない方針にして、衝突範囲を `RatingInput` に限定。
