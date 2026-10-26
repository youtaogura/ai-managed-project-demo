# Issue #38 【部品】レーティングの星（表示用・入力用）を新デザインにする

## 背景・目的

評価はこのアプリの「気持ちよさ」の中心。#25 の星ドラッグ入力と星の表示を、デザインシステム `docs/design-system/components/RatingStars/README.md` の見た目（白い星 `accent`、未到達 `star-off`）に合わせる。

### 現状（コード上の事実）
- `components/StarRating.tsx`: `fills: number[]` と `size` を受け取り、`★` の文字を 5 つ並べ、`overflow: hidden` の幅で部分塗りする。色は `theme.ts` の `starColors`（= tokens の accent / starOff）。`RatingInput` のみが使用。
- `components/RatingInput.tsx`: `value: string`（フォームの文字列）/ `error` / `onChange(text)`。`View` の responder でドラッグ入力、`accessibilityRole="adjustable"`、増減アクション、右に数字、「クリア」。**±0.1 ボタンと触覚フィードバックはない**。星サイズは `STAR_SIZE`=36（`theme.ts`）。
- `lib/recordForm.ts`: `parseRating` `formatRating`（lib/format にも同名あり）`stepRating`（±0.1、1.0〜5.0 にクランプ。未入力から＋で 3.0）`ratingFromPosition`（x → 1.0〜5.0、0.1 刻み）`starFills`。
- `components/RecordForm.tsx` が `RatingInput` を使用。既存テスト `__tests__/RecordForm.test.tsx` が評価操作（ドラッグ・スクロール奪取防止など）を検証している。
- `expo-haptics` は未導入。`design/tokens.ts` に `colors.accent` `colors.starOff` `typography.displayNumber/value/label` `size.touchMin` がある。

## スコープ

### やること
1. **表示用 `RatingStars`**（新規 `components/RatingStars.tsx`）: `rating: number | null`、`size`（星 1 つの px、既定 14）、`showValue`（既定 true）、`valueVariant: 'displayNumber' | 'value'`（既定 `value`）。星は `accent`、未到達は `starOff`。評価ありは右に数字（`formatRating`）、`null` は星をすべて `starOff` にして数字の代わりに「未評価」（`label`・`textSecondary`）。星全体を 1 つの画像として「レーティング 4.2」と読み上げる（未評価は「レーティング 未評価」）。
2. **入力用 `RatingInput`**（既存を作り直し。名前・props `value/error/onChange` は維持して `RecordForm` と既存テストを壊さない）: 星 38px（`RATING_INPUT_STAR_SIZE`）をなぞる／タップで 0.1 刻み。星の左に「−」、右に「＋」の丸ボタン（`size.touchMin` 以上、0.1 ずつ、1.0〜5.0 クランプ）、星の下に大きな数字（`displayNumber`、未入力は「未評価」）、「クリア」ボタン。
3. **触覚フィードバック**: 値が整数の境目をまたいだとき（例 2.9→3.0、3.0→2.9）だけ `expo-haptics` の `impactAsync(ImpactFeedbackStyle.Light)` を呼ぶ。Web と非対応端末（`Platform.OS === 'web'`、または呼び出しが reject/throw）では何もしない。ドラッグ・±ボタン・読み上げの増減のどれで値が変わっても同じ規則を使う。
4. 既存 `StarRating` は `RatingStars` に置き換えて削除する（利用は `RatingInput` だけ）。

### やらないこと
- フォーム・詳細・一覧への新規組み込み（#40、#41）。`RecordForm` は `RatingInput` を既に使っているので、見た目が変わるのみで差し替え作業はしない。
- 新しい色・文字スタイル・トークンの追加。

## 受け入れ条件

- [ ] 表示用: `rating=4.2` で 5 つの星のうち 4 つが 100%、5 つ目が 20% 塗られ、他は 0%。`null` は全星 0%（塗りなし）
- [ ] 表示用: 塗りは `colors.accent`、未到達は `colors.starOff`
- [ ] 表示用: 評価ありは数字「4.2」、`null` は「未評価」が出る。`showValue=false` では出ない
- [ ] 表示用: 星全体が 1 つの画像（`accessibilityRole="image"`）で、ラベルが「レーティング 4.2」（`null` は「レーティング 未評価」）。個々の星は読み上げ対象にならない
- [ ] 入力用: なぞる／タップで 0.1 刻みに値が変わる（既存 `RecordForm.test.tsx` の評価テストがそのまま通る）
- [ ] 入力用: 星は 38px、「−」「＋」ボタンは 44px 以上で `accessibilityLabel`（「レーティングを 0.1 下げる／上げる」）を持つ
- [ ] 「＋」「−」で 0.1 ずつ変わる。5.0 で「＋」、1.0 で「−」を押しても値は変わらない（1.0 未満・5.0 超にならない）。未入力で「＋」は 3.0 になり、未入力で「−」は未入力のまま
- [ ] 「クリア」で未入力（`''`）に戻り、数字は「未評価」になる
- [ ] 星の下の数字は `displayNumber` で、値を表示する（例「4.2」）
- [ ] 読み上げ: `accessibilityRole="adjustable"`、ラベル「レーティング」、`accessibilityValue.text` が値（「4.2」または「未評価」）。`increment` / `decrement` アクションで 0.1 ずつ増減する
- [ ] 星の上のタッチは親にスクロールを奪われない（既存の `onResponderTerminationRequest` が false）
- [ ] 触覚: 値が整数の境目をまたぐ変更（例 2.9→3.0、3.1→2.9 をまたぐ場合も）で `impactAsync` が 1 回呼ばれ、またがない変更（3.0→3.1、2.8→2.9）・同じ値への変更・クリアでは呼ばれない。未入力からの最初の入力では呼ばない
- [ ] 触覚: `Platform.OS === 'web'` では呼ばれない。`impactAsync` が reject してもエラーにならず値は更新される
- [ ] `pnpm check` が通る（カバレッジ閾値維持、変更行 80% 以上）

## 画面・振る舞い

### 表示用
横並び: 星 5 つ（隙間 2px）→ 数字（隙間 `space['2']`）。数字は詳細で `displayNumber`、一覧で `value`。部分塗りは 1 つ目の星から順に `starFills` を使う（0.1 刻み）。

### 入力用（縦並び）
1. 見出し「レーティング（1.0〜5.0）」（`label`・`textSecondary`、既存文言を維持）
2. 行: 「−」丸ボタン／星（幅 38×5=190、responder）／「＋」丸ボタン。丸ボタンは面 `surface2`（なければ既存 tokens の面色）、押下可能領域 44px 以上
3. 大きな数字（`displayNumber`、中央）。未入力は「未評価」を同じ位置に `label` 相当で出す
4. 「クリア」（テキストボタン、`accessibilityLabel`「レーティングをクリア」維持、高さ 44 以上）。未入力のときは無効（`disabled`）にしてよい
5. エラーは下に `micro`・`danger`（既存 `error` prop）

状態遷移: 値は親が持つ（制御コンポーネント、`value: string`）。入力イベント → 新しい文字列を `onChange`。同じ値なら `onChange` を呼ばない（現状維持）。不正な文字列（`parseRating` が NaN）は未入力として表示し、＋で 3.0。

触覚: `onChange` を呼ぶ直前に、旧値・新値（数値）を `crossesInteger(prev, next)` で判定し、またぐなら `triggerRatingHaptic()`。旧値が未入力・NaN のときは判定しない。

## 設計

### 追加・変更ファイル
- `src/components/RatingStars.tsx`（新規）: 表示用。`starFills` を再利用。星は `★` 文字 + 幅クリップ（現 `StarRating` と同方式。SVG 等は導入しない）。`AppText` で数字を描く。色は `design/tokens.ts` の `colors` を直接使う
- `src/components/RatingInput.tsx`（作り直し）: 上記。`RatingStars` を `showValue={false}`、`size=38` で使う
- `src/components/StarRating.tsx`（削除）
- `src/lib/recordForm.ts`: `crossesInteger(prev: number, next: number): boolean` を追加（`Math.floor(prev) !== Math.floor(next)` かつ値が異なる。例 2.9→3.0 true、3.0→3.1 false、3.0→2.9 true。1.0 未満は対象外なので境目は 2〜5 のみ意識すればよい）
- `src/lib/haptics.ts`（新規）: `triggerRatingHaptic(): void`。`Platform.OS === 'web'` なら return。`Haptics.impactAsync(Light)` を呼び、`.catch(() => {})` と try/catch で握りつぶす
- `src/theme.ts` の `STAR_SIZE` は他で使われていなければ `RATING_INPUT_STAR_SIZE = 38` を `RatingInput` 内の定数にして参照を外す（`theme.ts` は互換層なので値は触らなくてよい）
- テスト: `components/__tests__/RatingStars.test.tsx`、`components/__tests__/RatingInput.test.tsx`、`lib/__tests__/haptics.test.ts`、`lib/__tests__/recordForm.test.ts` に `crossesInteger` を追加

### 新しい依存
- **`expo-haptics`**（`npx expo install expo-haptics` で SDK 58 互換版を解決）
  - 理由: Issue 指定。整数の境目の触覚は Expo の公式モジュールが最も簡単で、Web / 非対応端末では no-op に近く、`app.json` のプラグイン設定も不要
  - 代替案: React Native 標準の `Vibration`（振動が強く「ごく軽い」に合わない、iOS では細かい制御不可）→ 却下 / `react-native-haptic-feedback`（Expo 管理外でネイティブビルド設定が増える）→ 却下
  - Jest では `jest.mock('expo-haptics')` で `impactAsync` をモックする

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 星の塗り 4.2 / null、色 | `RatingStars.test.tsx`（各星のクリップ幅 = size × fill をスタイルで確認。色は `colors.accent` / `starOff`） |
| 数字・未評価・`showValue` | `RatingStars.test.tsx` |
| 画像ラベル | `RatingStars.test.tsx`（`getByRole('image', {name: 'レーティング 4.2'})`） |
| なぞる／タップ | 既存 `RecordForm.test.tsx` ＋ `RatingInput.test.tsx`（responder の grant/move/release を `fireEvent` で） |
| ±ボタン、クランプ、未入力 | `RatingInput.test.tsx`（`onChange` モックに `'3.1'` 等が渡る） |
| クリア | `RatingInput.test.tsx` |
| adjustable・増減アクション | `RatingInput.test.tsx`（`fireEvent(el, 'accessibilityAction', {nativeEvent: {actionName}})`） |
| 触覚（またぐ／またがない／web／reject） | `RatingInput.test.tsx`（`expo-haptics` をモック）、`haptics.test.ts`（`Platform.OS` を差し替え、reject を握りつぶす） |
| `crossesInteger` | `recordForm.test.ts` |

## 判断ログ

- **作り直し vs 置き換え**: `RatingInput` は名前と props を維持して中身を作り直し、`StarRating` は `RatingStars` に改名・拡張（削除）した。props を変えると `RecordForm` とその既存テスト（受け入れ条件「既存テストが通る」）に影響するため。却下: 新規 `RatingStars` を別名で並置し旧を残す案（デッドコードが残る）
- **星の描画方法**: 現行の `★` 文字 + クリップを踏襲。却下: `react-native-svg` 導入（依存追加の理由が弱い）。文字だとフォントで見た目が揺れるため、問題があれば人間が SVG 化を判断する（提案）
- **触覚の発火規則**: 「整数の境目をまたいだ」を `floor` の変化で判定。ドラッグで 2 つの境目を一気に飛んだ場合も 1 回。ドラッグ中の連続発火を避けるため、値が変わらなければ呼ばない。未入力からの最初の入力は境目をまたいだと言えないので鳴らさない
- **触覚の強さ**: デザインの「ごく軽い」に合わせ `ImpactFeedbackStyle.Light`。`selectionAsync` は Android での感触が弱いので却下
- **触覚の失敗**: Web / 非対応端末では何もしないため、`Platform.OS` 判定と reject の握りつぶしの両方を入れる（`impactAsync` は非対応端末で reject する場合がある）
- **未入力で「−」**: 何も起きない（`stepRating` の既存仕様）。未入力で「＋」は 3.0 から始める（既存仕様）。ボタンは無効化せず操作可能のまま
- **星サイズ**: Issue は 38px、デザイン README は「36px 以上」。Issue の 38 を採用（36 以上を満たす）。`theme.ts`（人間管轄ではないが互換層）の `STAR_SIZE=36` は変更せず新定数を使う
- **未評価の入力用表示**: 大きな数字の位置に「未評価」を出す（`displayNumber` ではなく `label` 相当）。デザインに規定がないため。違和感があれば人間が調整する（提案）
- **丸ボタンの面色**: tokens の既存面色（`surface2`）を使う。新しい色は足さない
- **見た目の確認**: 撮影ツール（`ui-preview`）は実装工程で使えるか確認し、使えなければ PR 本文にその旨を書く。この Issue は部品のみで画面への組み込みがないため、撮影対象の画面は既存のフォーム（`RatingInput` を含む）。撮影していない画面を「デザインどおり」とは書かない
