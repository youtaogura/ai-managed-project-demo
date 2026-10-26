# Issue #37 【部品】ボタン・チップ・入力欄・ボトムシート・情報セル・空の表示

## 背景・目的

画面の作り直し（#39〜#43）で共通に使う基本部品を、デザインシステム（`docs/design-system/components/<部品名>/README.md`）に合わせて作る。#35 でトークン・ダークテーマ・`AppText` が入ったので、それを土台にする。

### 現状（コード上の事実）
- `app/src/design/tokens.ts` に `colors` `typography` `space` `radius` `size` がある。`AppText`（`variant` で `typography` を適用）がある。
- 既存の関連部品: `SegmentedControl`（`RecordForm` が使用）、`DateField`（`RecordForm` が使用）、`EmptyState`（`RecordsScreen` `AnalyticsScreen` が `title` / `description` / `children` で使用、旧スタイル）。
- アイコンライブラリは未導入（`@expo/vector-icons` なし）。`react-native-reanimated` / `gesture-handler` は直接の依存ではない。
- 撮影ツール `orchestrator/tools/ui-preview` はこのリポジトリにない（実装担当は存在を再確認すること）。

## スコープ

### やること
`app/src/components/` に次の部品を作る（すべて名前付き export、色・余白・角丸・サイズは `design/tokens.ts` から、文字は `AppText`）。

1. `Button`: 主ボタン / 枠ボタン（`danger` あり）/ 丸いアイコンボタン（`surface-2`、`onImage` で `scrim`）/ 記録ボタン（白い円に＋）
2. `Chip`（`ChipGroup`）: 単一選択のグループ
3. `TextField`: 1行・複数行・ISBN 用。あわせて同じ見た目の `DateFieldButton`（日付のボタン）
4. `BottomSheet`
5. `InfoCell`（`InfoCellRow` で3つ横並び）
6. `EmptyState`（既存を置き換え。下記）

### やらないこと
- 画面への組み込み・既存画面の置き換え（#39〜#43）。`SegmentedControl` `DateField` は残す（`RecordForm` が使うため。画面側の移行 Issue で削除する）
- 日付選択ダイアログ自体（`DateFieldButton` は押したときのコールバックを呼ぶだけ）
- `CoverCard`（#36）、`RatingStars`（#38）、`TabBar` `YearCounter`（#39）
- トークン・`docs/design-system/` の変更

## 受け入れ条件

### Button
- [ ] 主ボタンは `accent` 面・`accentInk` 文字、枠ボタンは面なし・枠 `lineStrong`・`textPrimary` 文字。高さ `size.buttonHeight`、角丸 `radius.button`（スタイルをテストで検証）
- [ ] `tone="danger"` の枠ボタンは文字と枠が `danger`
- [ ] 丸いアイコンボタンは `size.touchMin` の円、面 `surface2`。`onImage` のとき `scrim`。`accessibilityLabel` が必須（型で必須にし、テストで `getByLabelText` で取れる）
- [ ] 記録ボタンは `touchMin` の円・`accent` 面。読み上げラベルは「記録する」。表示は「＋」
- [ ] すべて `accessibilityRole="button"`。押すと `onPress` が呼ばれる。`disabled` では呼ばれず `accessibilityState.disabled` が真
- [ ] 押下中は不透明度 0.8・scale 0.97（`pressed` のスタイルをテストで確認）

### Chip
- [ ] グループは `accessibilityRole="radiogroup"`、各チップは `radio` で `accessibilityState.checked`（と `selected`）が選択中のみ真
- [ ] 選択中は `accent` 面・枠 `accent`・`accentInk` 文字、未選択は枠 `lineStrong`・`textSecondary` 文字
- [ ] チップを押すと `onChange(value)` が呼ばれる（選択中を押しても呼んでよい）。選択の見た目は `value` の更新で即時に切り替わる
- [ ] 列数（`columns`）で等幅グリッド（種別 5・ステータス 2）。高さ `touchMin`、`compact`（40px）のときは `hitSlop` でタップ領域が 44px 以上になる
- [ ] 角丸 10（部品内の定数。判断ログ参照）、文字は `label`

### TextField
- [ ] 見出し（`label`・`textSecondary`）が入力欄の上に出て、入力欄の `accessibilityLabel` になる。`required` で「（必須）」、`optionalLabel` で「（任意）」が見出しに付く
- [ ] 入力欄は面 `surface2`、枠 `line`、角丸 12、高さ `buttonHeight`、左右余白 14、プレースホルダー色 `textTertiary`
- [ ] フォーカスで枠 `accent`、フォーカスを外すと `line` に戻る
- [ ] `error` があると入力欄の下に `micro`・`danger` で出て、枠も `danger`（フォーカス中も `danger` を優先）。なければ出ない
- [ ] `multiline` は最小高さ 120 で内容に合わせて伸びる（`textAlignVertical="top"`）
- [ ] `variant="isbn"` は高さ 56・文字 22 太字・`keyboardType="number-pad"`（`numeric`）
- [ ] `onChangeText` が呼ばれ、他の `TextInput` props を透過する
- [ ] `DateFieldButton`: 入力欄と同じ見た目のボタン。値があれば値、なければプレースホルダー色の「選択してください」（`placeholder` で変更可）。押すと `onPress`。`accessibilityRole="button"`、ラベルは「見出し 値」。`error` の扱いは TextField と同じ

### BottomSheet
- [ ] `visible=false` では中身が描画されない。`true` で中身と `title`（`sectionTitle`）が出る
- [ ] 面 `surface1`・上の角丸 20・上端中央につまみ（36×4、`lineStrong`）、後ろは `scrim`。左右余白 `space[6]`。下に `useSafeAreaInsets().bottom` の余白を足す
- [ ] 後ろ（scrim）のタップ、Android の戻る（`onRequestClose`）、閉じるボタン（`showCloseButton`、ラベル「閉じる」）で `onClose` が呼ばれる。シート本体のタップでは呼ばれない
- [ ] 下へのスワイプ（しきい値超え）で `onClose` が呼ばれる。しきい値未満なら戻る
- [ ] ダイアログとして扱う: シートのルートが `accessibilityViewIsModal`（iOS）、`role="dialog"` 相当を持ち、見出しがあれば `accessibilityLabel` に使う。Android は `Modal` が後ろへのフォーカスを遮る。後ろの scrim は読み上げ対象にしない（`accessible={false}`、閉じる手段は閉じるボタン／スワイプ／戻るで確保）
- [ ] 出現アニメーションは下から 250ms・減速（`Easing.out`）。「動きを減らす」（`AccessibilityInfo.isReduceMotionEnabled`）がオンならフェードのみ（テストでは `Animated` をモックせず、描画の有無と構造だけ確認）
- [ ] 削除確認の使い方（`onClose` を「キャンセル」と同じ扱い）は使う側の責務。README の用途を満たせるよう `children` に任意の `Button` を置ける

### InfoCell
- [ ] 見出し（`micro`・`textSecondary`）と値（`value`・`textPrimary`）を表示。面 `surface2`、角丸 `radius.card`、内側余白 縦 10 × 横 12
- [ ] `value` が空文字・`undefined`・`null` のときは「—」を表示（セルは消えない）
- [ ] `onPress` があるときはボタンとして扱い（`accessibilityRole="button"`、ラベル「見出し 値」）、押すと呼ばれる。なければ押せる扱いにしない
- [ ] `InfoCellRow` は子を横に等幅（`flex: 1`）で、間隔 `space[2]` で並べる
- [ ] 見出しの文言の切り替え（読み始めた／見始めた）は使う側で行う（部品は `label` を受け取るだけ）。切り替え用の純粋関数 `infoCellLabels(kind)` を `lib/` に置き、本・漫画は「読み始めた／読み終えた」、映像（映画・ドラマ・アニメ）は「見始めた／見終えた」を返す

### EmptyState
- [ ] 枠だけ（`starOff` の点線枠）の書影を 4 つ並べ、最初の 1 つに「＋」がある。`onAction` があれば最初の書影をタップしても `onAction` が呼ばれる（ラベル「記録する」）
- [ ] `title`（`sectionTitle`）、`description`（`label`・`textSecondary`）を表示。`description` は省略可
- [ ] `actionLabel` と `onAction` があれば主ボタンを 1 つ出し、押すと `onAction` が呼ばれる。`actionLabel` の既定は「記録する」
- [ ] 既存の呼び出し互換: `children` が渡されたときは主ボタンの代わりに `children` を描画する（`RecordsScreen` `AnalyticsScreen` は無修正で動く）。既存の `EmptyState` テストは通る
- [ ] 「振り返り」用は文言違いだけで同じ部品を使う（文言は画面側 Issue で渡す）

### 全体
- [ ] タップできるものはすべて 44px 以上（`size.touchMin`。詰める場合は `hitSlop`）
- [ ] 色・余白・角丸・サイズの数値を画面に直書きしない。トークンにない値（Chip 角丸 10・TextField 角丸 12・左右余白 14・BottomSheet 角丸 20／つまみ 36×4・InfoCell 余白 10×12・複数行 120・ISBN 56/22・Chip 詰め高さ 40・間隔 6）は部品内の名前付き定数にする
- [ ] `pnpm check` が通る（カバレッジ閾値・差分カバレッジ 80% を維持）

## 画面・振る舞い

部品単体の仕様であり、画面は作らない。状態は次のとおり。
- Button: 通常 / 押下中 / 無効。
- Chip: 選択中 / 未選択。
- TextField: 通常 / フォーカス / エラー。
- BottomSheet: 閉 → 開（下からスライド、または フェード）→ 閉（背景タップ・スワイプ・閉じるボタン・戻る）。閉じる処理は `onClose` を呼ぶだけで、`visible` は使う側が管理する。
- InfoCell: 値あり / 値なし（「—」）。
- 画像の確認: `ui-preview` が使えないときは撮影せず、その旨を PR 本文に書く。構成（要素・文言・状態の出し分け）を Jest で確認する。「デザインどおり」とは書かない。

## 設計

### 追加・変更するファイル
| ファイル | 内容 |
|---|---|
| `app/src/components/Button.tsx` | `Button`（`variant: 'primary' \| 'outline' \| 'icon' \| 'record'`、`tone?: 'danger'`、`onImage?`、`label`、`accessibilityLabel`、`onPress`、`disabled`、`children`（アイコンの中身）） |
| `app/src/components/Chip.tsx` | `ChipGroup<T extends string>`（`label`、`options`、`value`、`onChange`、`columns`、`compact`）と内部の `Chip` |
| `app/src/components/TextField.tsx` | `TextField`、`DateFieldButton` |
| `app/src/components/BottomSheet.tsx` | `BottomSheet`（`visible`、`onClose`、`title?`、`showCloseButton?`、`children`） |
| `app/src/components/InfoCell.tsx` | `InfoCell`、`InfoCellRow` |
| `app/src/components/EmptyState.tsx` | 置き換え（後方互換の props を維持） |
| `app/src/lib/infoCellLabels.ts` | 種別 → 見出しの文言（`MediaKind` を使う） |
| `app/src/components/__tests__/{Button,Chip,TextField,BottomSheet,InfoCell}.test.tsx`、`EmptyState.test.tsx`（拡張）、`app/src/lib/__tests__/infoCellLabels.test.ts` | テスト |

### 構成・状態管理
- すべて制御コンポーネント（値・選択は props、`useState` は TextField のフォーカスと BottomSheet のアニメーション/スワイプのみ）。
- 押下の見た目は `Pressable` の `style` コールバック（`pressed` で opacity 0.8・`transform: [{ scale: 0.97 }]`）。100ms の遷移は `Animated` を使わず、押下に即応させるだけとする（判断ログ）。
- BottomSheet: RN の `Modal`（`transparent`、`animationType="none"`、`onRequestClose`）+ `Animated`（`translateY`、`useNativeDriver: true`）+ `PanResponder`（つまみ付近でのスワイプ。しきい値は 80px または速度で判定）+ `useSafeAreaInsets`。「動きを減らす」は `AccessibilityInfo.isReduceMotionEnabled()` を読んで切り替える。
- アイコンは文字（「＋」など）と View で描く。アイコン用の依存は追加しない。丸いアイコンボタンの中身は `children`（呼び出し側が渡す）。
- 文字は `AppText`。フォーカス・値の色は `colors` から。

### 新しい依存
**なし**。BottomSheet は標準の `Modal` + `Animated` + `PanResponder` で実装する。

## テスト方針

Jest + `@testing-library/react-native`。`__tests__/` に部品ごとのファイルを置く。ユーザー操作（`fireEvent.press` / `changeText` / `focus`/`blur`）と、表示・アクセシビリティ属性・トークン由来のスタイルを検証する。

| 受け入れ条件 | テスト |
|---|---|
| Button の見た目・種類・ラベル・disabled・押下 | `Button.test.tsx`（`StyleSheet.flatten` で背景色・枠色・サイズ、`pressed` スタイルは `Pressable` の style 関数を呼んで検証） |
| Chip のラジオ属性・選択・コールバック・hitSlop | `Chip.test.tsx` |
| TextField の見出し・エラー・フォーカス・複数行・ISBN・DateFieldButton | `TextField.test.tsx` |
| BottomSheet の表示/非表示・scrim タップ・閉じる・戻る・スワイプ・アクセシビリティ | `BottomSheet.test.tsx`（`SafeAreaProvider` の `initialMetrics` を `testProviders` で渡す。スワイプは `PanResponder` のハンドラを `panHandlers` 経由で直接呼ぶか、ドラッグ関数を `lib` の純粋関数に切り出して単体テスト） |
| InfoCell の値・「—」・押下・Row | `InfoCell.test.tsx`、`infoCellLabels.test.ts` |
| EmptyState の構成・ボタン・children 互換 | `EmptyState.test.tsx` |
| 44px 以上 | 各テストで `minHeight`/`minWidth`/`hitSlop` を確認 |

## 判断ログ

1. **既存部品との関係**
   - 選んだ案: `EmptyState` は同名のファイルを新デザインで置き換え、`children` を渡すと主ボタンの代わりに描画（後方互換）。`SegmentedControl` / `DateField` は残し、`Chip` / `DateFieldButton` を新規に足す。
   - 却下: 全面置き換え（`RecordForm` の変更・テスト修正が必要で、「既存画面は置き換えなくてよい」に反する）。`EmptyState` を別名で並存（同名の重複で混乱する。`EmptyState` は使用箇所が 2 つで互換にできる）。
   - 理由: 既存画面の挙動を壊さず、画面 Issue（#39〜#43）で順次移行できる。
2. **BottomSheet にライブラリを使うか**
   - 選んだ案: ライブラリなし（`Modal` + `Animated` + `PanResponder`）。
   - 却下: `@gorhom/bottom-sheet`（`reanimated` / `gesture-handler` の追加とネイティブ設定が必要で、Expo Go・Web・Jest の確認コストが高く、依存の CI（`dependencies`）にも影響する）。`react-native-modal`（追加依存に見合う機能がない）。
   - 理由: 要件（下からせり上がる・scrim・スワイプで閉じる・モーダル扱い）は標準 API で足りる。依存を増やさない。
3. **アイコン**: ライブラリを足さず、文字（＋）で描く。丸いアイコンボタンは `children` でアイコンを受ける。実際のアイコン（並び替え・戻る・カメラ）は画面側 Issue で必要になったときに、アイコン方針と合わせて決める。
4. **押下アニメーション**: README の「100ms」は `Animated` ではなく押下中スタイルの即時切り替えとして実装する（アニメーションのテスト不安定さを避ける）。後で必要なら見直す。
5. **トークンにない値の提案**（トークン追加は人間が行う）: `radius.chip`（10）、`radius.field`（12）、`radius.sheet`（20）、`space.fieldX`（14）、`size.sheetHandle`（36×4）、`size.fieldMultilineMin`（120）、`size.isbnFieldHeight`（56）、`size.chipCompact`（40）。追加されるまで各部品内の定数にする（README が BottomSheet について許可している方式を他にも適用）。
6. **日付の欄**: README は「日付の欄も同じ見た目のボタン」とあるので `DateFieldButton` を `TextField` と同じファイルに置く。日付選択ダイアログは範囲外（画面側 Issue。ライブラリが必要なら仕様書に名前を書く）。
7. **タップ領域**: Chip の詰め（40px）は `hitSlop` で 44px 以上に。`TextField`（48）・`Button`（48 / 44 の円）は `touchMin` 以上。
8. **scrim の読み上げ**: scrim のタップは視覚ユーザー向けとし、読み上げでは閉じるボタン／戻る／スワイプで閉じられるようにする（`showCloseButton` を画面側で原則 `true` にすることを推奨）。
9. **`ui-preview` が使えない場合**: PR 本文に撮影していないことを書き、構成を Jest で検証する。
