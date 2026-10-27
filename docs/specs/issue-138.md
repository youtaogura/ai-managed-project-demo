# Issue #138 読み終えた画面の「お気に入りにする」は文字を押しても切り替わらない

## 背景・目的
`FinishedScreen` の「お気に入りにする」は、カード（`View`）の中に文字（`AppText`）と `Toggle`（スイッチだけが `Pressable`）を並べている。
そのため文字を押しても切り替わらず、スクリーンリーダーでも文字とスイッチが別々に読まれる。
`components/Toggle.tsx` には行全体が `Pressable`（`accessibilityRole="switch"`）の `ToggleRow` が既にあるので、同じ作りの行をこれに寄せてそろえる。

## スコープ
やること
- `FinishedScreen` のお気に入りの行を、行全体で切り替わる 1 つのスイッチにする。
- 同じ作り（ラベル＋ `Toggle` を並べた行）がほかにないか確認し、あれば同様にそろえる。
  調査結果:
  - `components/Starter.tsx` の「引用として残す」: `Toggle small` と文字が別 → 行全体にする。
  - `StartersScreen` の「読み終えたら書き出しを出す」: すでに `ToggleRow` → 対応済み、変更なし。
  - `StartersScreen` の書き出しの各行: 文字を押すと編集（`StarterText` の `onEdit`）になるので、行全体のトグル化はしない（却下理由は判断ログ）。固定行は無効のまま。

やらないこと
- 見た目（色・余白・寸法）の変更、トークン追加、新しい依存。

## 受け入れ条件
- [ ] 「お気に入りにする」の文字を押すと、お気に入りが切り替わる（FinishedScreen、Jest）。
- [ ] 行全体が `accessibilityRole="switch"` の 1 要素で、ラベル「お気に入りにする」と `checked` 状態がその 1 要素にまとまっている。同名のスイッチが 2 つ存在しない（Jest）。
- [ ] 切り替え後の保存・失敗時の巻き戻しなど既存の振る舞いは変わらない（既存テスト）。
- [ ] 「引用として残す」の文字を押しても切り替わり、ラベルと状態が 1 つの switch にまとまっている（Starter、Jest）。
- [ ] 行の高さは `size.touchMin`（44）以上を保つ。

## 画面・振る舞い
- 読み終えた画面: 枠付きのカード全体が 1 つのスイッチ。どこを押しても on/off。状態遷移・エラー表示は現状どおり（楽観更新→保存失敗で戻す）。
- 書き出しの続き: 「引用として残す」のスイッチと文字の行全体が 1 つのスイッチ。

## 設計
- `components/Toggle.tsx`: `ToggleRow` に任意の `style`（コンテナ用 `StyleProp<ViewStyle>`）と `small?: boolean` を追加し、枠付きカードにも、小さいスイッチの行にも使えるようにする（`Switch` に `small` を渡す）。既存の呼び出しは挙動不変。
- `screens/FinishedScreen.tsx`: `toggleRow` の `View`＋`AppText`＋`Toggle` を `<ToggleRow label="お気に入りにする" value={favorite} onValueChange={changeFavorite} style={styles.toggleRow} />` に置換。`styles.toggleLabel` は不要になるので削除。`toggleRow` スタイルの `flexDirection` などは `ToggleRow` 側と重複するため整理。
- `components/Starter.tsx`: `quoteRow` を `<ToggleRow small label="引用として残す" .../>` に置換（文字スタイルは `ToggleRow` のラベルに揃う。見た目差が出る場合は `label` の見た目を変えず現状に近い方を優先し、判断ログに記録）。
- 状態管理・データ構造の変更なし。

## テスト方針
- `screens/__tests__/FinishedScreen.test.tsx`: 文字（`getByText('お気に入りにする')`）を押して保存が呼ばれる／`getAllByRole('switch', {name})` が 1 件で `checked` が切り替わる。
- `components/__tests__/Toggle.test.tsx`: `ToggleRow` の `small`・`style` の追加分。
- `components/__tests__/Starter.test.tsx`: 「引用として残す」の文字を押すと `onChangeAsQuote` が呼ばれ、switch が 1 件。
- 既存の switch を名前で取っているテストが壊れないことを `pnpm check` で確認。

## 判断ログ
- **ToggleRow を拡張して使う（採用）** / FinishedScreen 内で `Pressable` を直書き（却下）: 既に同じ目的の部品があり、重複を避けられるため。
- **StartersScreen の書き出し行は対象外（採用）** / 行全体トグル（却下）: 文字を押すと編集に入る操作が既にあり、両立できない。スイッチのみ押せる現状を維持する。
- **Starter の「引用として残す」も対象（採用）**: Issue の「同じ作りの行も確かめ、そろえる」に該当するため。
- 依存の追加なし。
