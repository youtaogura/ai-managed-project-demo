# Issue #39 【画面】記録一覧・追加の入口・並び替えを新デザインにする

## 背景・目的

記録一覧を、書影が並ぶ「棚」にする。4つに分かれていた追加ボタンを1つの入口（＋ → 追加シート）にまとめる。デザイン: `docs/design-system/screens/README.md` の「記録（タブ）」。

## 設計

- `screens/RecordsScreen.tsx`: 見出し「記録」、並び替え（アイコンボタン）、記録ボタン（`Button variant="record"`）、`YearCounter`、「最近読み終えた・見終えた」（`CoverCard` hero の横スクロール、終了日の新しい順で最大10件。無ければ段ごと出さない）、「すべての記録」（`CoverCard` thumb、`FlatList` 4列、右に現在の並び順）。記録なしは `EmptyState`。上端は `ScreenContainer`、下端は `useBottomInset`（#30）。
- `components/AddSheet.tsx`: 「何を記録しますか」。バーコード → `/record/scan`、タイトルで探す → `/record/search`、ISBN → `/record/isbn`、手で入力する → `onAdd`（`/record/new`）。
- `components/SortSheet.tsx`: 項目（終了日・開始日・レーティング・タイトル・登録日時）ごとに向きを `ChipGroup` で選ぶ。選ぶと反映して閉じる。保存は既存の `useSortOrder` / `sortOrderStore`。
- `components/YearCounter.tsx`、`lib/yearCounter.ts`（今年・今月の数、最近終えた順）。
- `components/TabBar.tsx`: `Tabs` の `tabBar` に渡すカスタムのタブバー。タブ名は「記録」「振り返り」。タブの画面は `headerShown: false`。振り返りは画面内の見出し「振り返り」を足すのみ（中身は #43）。
- 旧 `SortSelector` / `RecordListItem` は使われなくなるので削除する。

## 受け入れ条件

Issue #39 のとおり。テスト: `screens/__tests__/RecordsScreen.test.tsx`、`lib/__tests__/yearCounter.test.ts`、`components/__tests__/YearCounter.test.tsx`、`__tests__/tabs.test.tsx`、`__tests__/headers.test.tsx`、`__tests__/safe-area.test.tsx`。

## 判断ログ

| 論点 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|
| アイコン | 文字の記号（⇅ ＋ ▤ ▥ ›）で代用 | `@expo/vector-icons` / SVG 追加 | 依存を増やさない。アイコン資産の追加はデザインシステム側で行うべきなので、**提案**: アイコンセットをトークン/部品として追加してほしい |
| 並び替えの向き | 既存の 8 種の `SortOrder` のまま、向きが片方しかない項目（タイトル・登録日時）は選択肢1つ | 新しい向き（タイトル降順など）の追加 | 並び順の保存形式を変えない（Issue の指示） |
| YearCounter の動き・節目の印 | 今回は作らない（数字の表示のみ） | 数え上がり・節目バッジ | 受け入れ条件に無く、記録完了の導線は別 Issue。追って対応 |
| TabBar の「再タップで先頭へ」 | `useScrollToTop` を一覧に付ける。カスタム TabBar は `tabPress` を emit する | 独自のスクロール制御 | react-navigation の標準の仕組みに乗る |
| タブバーの高さ | `tabbarHeight`(84) からホームインジケータ想定分 34 を引き、実際のインセットを足す | 84 固定 | 端末ごとのインセットに追従 |
| 追加シートの閉じるボタン | `BottomSheet` の既存「閉じる」ボタン | ×アイコン | 部品の既存仕様を変えない |
| 「記録する」ボタンの重複（記録なし） | `EmptyState` の ghost と主ボタンはどちらも追加シートを開く | ghost を除く | 共通部品を変更しない |
