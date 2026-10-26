# Issue #85 本棚を背表紙の棚にする

## 背景・目的

一覧を「書影の 4 列グリッド」から「背表紙の棚」に作り替える。書影がなくても、棚が埋まっていく様子で読書の積み上がりを見せる。デザインは `docs/design-system/screens/README.md` の「本棚」「本棚（本がない）」（`shelf.png`、`shelf-empty.png`）と、部品 `Spine`・`Shelf`・`EmptyState`・`TabBar`・`Chip`。依存の #83（読書専用）・#84（データ）は main に入っている。未リリースのため保存データの後方互換・移行は考えない。

## スコープ

### やること
- 部品 `Spine`（背表紙）と `Shelf`（棚）を作る。
- 本棚の画面（`RecordsScreen` を作り替える）: 見出し「本棚」と冊数、右上の追加ボタン、本棚の切り替えチップの場所、ステータスの絞り込み（下線タブ）、凡例、棚、本がないときの `EmptyState`。
- 背表紙のタップで、読んでる本は「読んでる本」、それ以外は「読み返す」へ。どちらの画面もまだ無いので、今の詳細画面（`/records/<id>`）へ遷移する。遷移先の振り分けは `onOpen(record)` の呼び出し側（`app/(tabs)/index.tsx`）の 1 か所に集める。
- タブバーを「本棚」「振り返り」「設定」にし、アイコンを書斎のもの（本棚＝背表紙 3 冊、振り返り＝縦の棒、設定＝スライダー）にする。
- 並び順は設定の並び順（既存の `SortOrder`）に従う。
- 「上に大きく出す作品」（#50）とその設定、4 列グリッド、`CoverCard` の使用を外す。

### やらないこと
- 本棚（タグ）の作成・選択・中身の絞り込み（#86）。チップの行は置くが、押しても一覧は変わらない（下記）。
- 本の追加シートの見た目（#87）。`AddSheet` は今のまま使う。
- 読んでる本・読み返す画面の作り直し。
- `src/design/tokens.ts` と `docs/design-system/` の変更。新しい依存の追加（なし）。

## 受け入れ条件

### 背表紙・棚
- [ ] `Spine` は本の ID から大きさを決める。同じ ID なら幅 `spineWidthMin`〜`spineWidthMax`・高さ `spineHeightMin`〜`spineHeightMax` の同じ値になり、並び順・ほかの本の有無に影響されない（純関数 `getSpineSize(id)` を Jest で確認。範囲内であること、同じ ID で同じ値、複数の ID でばらつくこと）。
- [ ] 背表紙の面の色は `record.spineColor`（`spine-1`〜`spine-10` → `colors.spine1`〜`spine10`）。タイトルは `spineTitle`・`spineInk`、縦書き（下記）。
- [ ] お気に入り（`favorite: true`）の本だけ朱の栞が出る。ステータスによって背表紙の見た目（色・大きさ・栞）は変わらない。
- [ ] 背表紙の読み上げラベルは「<タイトル>、<作者>、<ステータス>」。お気に入りなら末尾に「、お気に入り」。作者が無いときは作者の部分を省く。`accessibilityRole="button"`。
- [ ] 背表紙をタップすると `onPress(record)` が呼ばれる。
- [ ] `Shelf` は背表紙を間隔 3px で左から並べ、棚 1 段の幅（画面幅 − 左右 `space[4]`）に収まる数で次の段に折り返す。純関数 `layoutShelfRows(items, availableWidth)` で、**どの段も「幅の合計＋間隔」が `availableWidth` を超えない**こと、順序が保たれること、1 冊だけで幅を超える場合も 1 段 1 冊で落ちないこと、0 冊で空配列を Jest で確認する。
- [ ] 各段の下に棚板（`colors.shelfBoard`、高さ `size.shelfBoardHeight`、角丸 2、`shadows.cover`）。段と段の間は 30px。本の数だけ段が出る（棚板の数 = 段の数）。

### 本棚の画面
- [ ] 見出し「本棚」。その下に「<全冊数> 冊 · 今年読んだ <n> 冊」（n は今年に読み終えた日がある本の数。既存の `countCompletions` の `year`）。冊数は絞り込みの影響を受けず、全記録の数。
- [ ] 右上の追加ボタン（`accessibilityLabel`「本を追加」）で追加シートが開く。
- [ ] 本棚の切り替えチップの行（横スクロール）に「すべての本」（選択中）と、最後に点線の「＋ 本棚を作る」を出す。**作った本棚のチップは #86 で足す**（この Issue では本棚データを読まない）。「＋ 本棚を作る」は押しても何も起きない（`onCreateShelf?: () => void` を props に用意し、未指定なら何もしない）。
- [ ] ステータスの絞り込み（下線 `ribbon` 2px のタブ）: 「すべて」「読んでる」「読んだ」「読みたい」と、それぞれの件数。初期値は「すべて」。選択中のタブは `accessibilityState.selected`。
  - 「読んでる」= `in_progress`、「読んだ」= `completed`、「読みたい」= `planned`。`dropped`（途中でやめた）は「すべて」にだけ出る。件数の合計は「すべて」と一致しなくてよい。
  - タブを押すと、その状態の本だけが棚に並ぶ。件数は全記録から数える（絞り込みで変わらない）。
  - 絞り込んだ結果が 0 冊のときは、棚の代わりに短い案内「この状態の本はまだありません」を出す（`EmptyState` は使わない）。
- [ ] 凡例は「お気に入り」（小さな朱の栞の印と文字）だけ。
- [ ] 並び順は設定の並び順（`useSortOrder`、既定 `endDate_desc`）。読み終えていない本は同順位の中で登録日時の新しい順（既存の `sortRecords` の挙動を保つ）。並び替えても各本の背表紙の大きさは変わらない（Jest: 並び順を変えて同じ本の `width`/`height` スタイルが同じ）。
- [ ] 並び順を変える入口は、見出し右の追加ボタンの横の「並び替え」ボタン（既存どおり `SortSheet`）を残す。
- [ ] 背表紙のタップで `onOpen(record)` が呼ばれる。ルートでは `in_progress` なら将来の「読んでる本」、それ以外は「読み返す」だが、どちらも今は `/records/<id>` へ。
- [ ] 本が 1 冊もないとき、`EmptyState`（点線の空の背表紙が棚板に並ぶ・「最初の1冊を、棚に並べよう」・主ボタン「本を追加する」）を出し、「本を追加する」で追加シートが開く。見出しの「本棚」と追加ボタンも出す。
- [ ] 読み込み中は今までどおり `ActivityIndicator`（`accessibilityLabel`「読み込み中」）。

### タブバー
- [ ] タブのラベルは「本棚」「振り返り」「設定」。アイコンは書斎のもの（SVG ではなくビュー／既存のアイコン手段で描く。下記）。選択中は `textPrimary`、それ以外は `textTertiary`（トークンにあるもの。無ければ `textSecondary`）。
- [ ] 選択中のタブをもう一度押すと先頭までスクロールする（既存の `useScrollToTop` を維持）。

### 外すもの
- [ ] `CoverCard`、`HeroCriterionSheet`、`lib/heroCriteria.ts`、`AppSettings.heroCriterion`（型・既定値・`settingsStore` の検証・設定画面の行）、`YearCounter` コンポーネントを削除し、画面・テストから参照が無い。保存済みの設定に `heroCriterion` が残っていても無視され、読み込みで落ちない。バックアップの `settings` に `heroCriterion` があっても読み込める（無視する）。
- [ ] `lib/yearCounter.ts`（`countCompletions`）は残す（冊数の表示で使う）。`recentlyFinished` は使われなくなるなら削除（対応するテストも）。

## 画面・振る舞い

### 画面構成（上から）
1. 見出し行: 左に「本棚」（`screenTitle`）と「64 冊 · 今年読んだ 48 冊」（`label`・`textSecondary`）、右に並び替え（アイコンボタン）と追加（丸い `record` ボタン）。
2. 本棚の切り替えチップ（横スクロール）。選択中は `accent` の面・`accentInk` の文字。「＋ 本棚を作る」は点線の枠（`lineStrong`）。高さ 36px・タップ領域は `hitSlop` で `size.touchMin` 以上。左右 `space[5]`。
3. ステータスのタブ（下線）。全幅の下に `line` の線、選択中は `ribbon` の 2px 線。ラベル `body`、件数 `label`・`textSecondary`。各タブは `size.touchMin` 以上の高さ。
4. 凡例。
5. `Shelf`（縦スクロール）。1 段 = 背表紙を下揃えで並べた行 + 棚板。

画面全体を 1 つの縦 `ScrollView`（または `FlatList` の 1 段 = 1 行。`useScrollToTop` 用に `ref` を持つ）にして、上の 1〜4 を `ListHeaderComponent` に置く。段ごとに 1 行を描く（仮想化は件数が増えてから）。下の余白は `space[6] + bottomInset`。

### 縦書きタイトル
React Native には縦書きが無いので、タイトルを 1 文字ずつ縦に積む（`Array.from(title)` を `View` 内で縦に並べ、長音「ー」や括弧は回転しない簡易版）。背表紙の高さに収まらない分は切る（`overflow: 'hidden'`、省略記号なし）。上から 22px のところに `spineInk`（不透明度 0.3）の線。左右の端に細い陰（幅 2px、左を明るく・右を暗く、半透明の白／黒）。幅 34px 未満の背表紙は文字 12px。タイトルの `Text` は読み上げから隠す（`accessibilityElementsHidden`・`importantForAccessibility="no-hide-descendants"`）。読み上げは背表紙の `Pressable` のラベルで行う。

### 状態
- 絞り込みの状態は画面の `useState`（`'all' | RecordStatus` ただし `dropped` は含めず `'all' | 'in_progress' | 'completed' | 'planned'`）。画面を離れて戻っても保存しない（初期値「すべて」）。
- 記録は `useFocusEffect` で再読み込み（既存の `useRecords`）。
- 押した瞬間に少し持ち上がる（translateY −4px、100ms）。`Pressable` の `pressed` で `transform` を切り替えるだけの簡易版でよい（アニメーションの実装は任意。テストはしない）。

### エラー・端のケース
- 記録の取得に失敗したら空配列（既存の `useRecords` の挙動）で、`EmptyState` になる。
- タイトルが空・極端に長い本でも落ちない。幅の計算結果が棚幅を超える背表紙は 1 段 1 冊で出す。
- 棚幅は `useWindowDimensions().width − space[4] * 2`（`Shelf` が受け取る `width` props。デザインの「画面の幅 − 左右 `space-4`」）。

## 設計

### 追加・変更するファイル
- `src/lib/spineLayout.ts`（新規）: `getSpineSize(id): { width: number; height: number }`（ID の文字列ハッシュ → 幅・高さそれぞれを範囲内に写像。幅と高さは別のハッシュ片を使い相関させない）、`layoutShelfRows<T extends { id: string }>(items: readonly T[], availableWidth: number, gap = 3): T[][]`。`SPINE_GAP = 3`、`SHELF_ROW_GAP = 30` を export。
- `src/lib/spineLabel.ts`（新規）: `getSpineAccessibilityLabel(record)`。ステータスの言葉は読書専用の「読んでる／読んだ／読みたい／途中でやめた」（`getStatusLabel` の「読み終わった」とは違うため、この中で持つ。判断ログ 3）。
- `src/components/Spine.tsx`（新規）: props `record: MediaRecord`、`onPress: (record) => void`。`spineColor` から `colors[...]` への対応表（`spine-1` → `colors.spine1`）は同ファイルに置く。
- `src/components/Shelf.tsx`（新規）: props `records: readonly MediaRecord[]`、`width: number`、`onPressRecord`。内部で `layoutShelfRows` を呼び、段ごとに `Spine` の行 + 棚板を描く。
- `src/components/StatusTabs.tsx`（新規）: 下線タブ。props `value`、`counts: Record<StatusFilter, number>`、`onChange`。`accessibilityRole="tab"`。
- `src/components/ShelfChips.tsx`（新規）: 本棚の切り替えの行（今は「すべての本」と「＋ 本棚を作る」のみ。#86 が `shelves` props を足す前提の形にしておく: `shelves?: readonly { id: string; name: string }[]` を受け、渡されれば「すべての本」の後ろに出す。選択の保持は #86 で。この Issue では渡さない）。
- `src/components/EmptyState.tsx`: 点線の空の背表紙を高さをばらつかせて棚板の上に並べる形に変更（今の 4 個の幽霊枠から。`actionLabel` の既定を「本を追加する」にし、枠の `+` ボタンの `accessibilityLabel` はやめて主ボタンだけにする。他の使用箇所 `ReviewEmpty` などへの影響を確認して、既存テストを更新する）。
- `src/components/TabBar.tsx`: アイコンを書斎のものに。アイコンは新しい依存を足さず、`View` で描く小さな部品（`TabIcon`: `shelf` 背表紙 3 本、`stats` 縦棒 4 本、`settings` スライダー 2 本）を同ファイル内に置く。
- `src/app/(tabs)/_layout.tsx`: `index` のタイトルを「本棚」に。
- `src/app/(tabs)/index.tsx`: `onOpen` で records 詳細へ（`in_progress` と他の分岐の場所を 1 か所にまとめ、コメントで #後続に差し替える旨を残す）。
- `src/screens/RecordsScreen.tsx`: 作り替え。`onOpen?: (id: string) => void` は維持（今の呼び出し・テストを壊さない。ステータスの分岐は後続でシグネチャを変えるときに）。`onAdd` も維持。`onCreateShelf?` を追加。
- 削除: `components/CoverCard.tsx`、`components/HeroCriterionSheet.tsx`、`components/YearCounter.tsx`、`lib/heroCriteria.ts`、それぞれのテスト（ソースも同じ PR で削除するので `pr-policy` の条件を満たす）。`SettingsScreen` の「大きく出す作品」行と `HeroCriterionSheet`、`types/settings.ts` / `lib/settingsStore.ts` の `heroCriterion`、`lib/heroColor.ts` は `RecordDetailScreen` が使うので残す。`heroCriterion` を参照するテスト（`settingsStore` / `useSettings` / `backup` / `importBackup` / `deleteAllRecords` / `DataScreen`）は、フィールドが無くなる前提に更新する（テストの削除・skip はしない）。
- `docs/design-system/` は変更しない。

### データ構造
- 追加の保存データなし。`StatusFilter = 'all' | 'in_progress' | 'completed' | 'planned'`（`types/` ではなく `StatusTabs.tsx` から export）。件数は `countByStatus(records)`（`lib/` の純関数）で数える。

### 状態管理
React の state / context のみ。新しいライブラリなし。

### デザイン値
色・余白・角丸・サイズは `tokens.ts` から使う（`colors.spine1..10` `spineInk` `shelfBoard` `ribbon` `size.spine*` `size.shelfBoardHeight` `shadows.cover`）。トークンに無い 3px・30px・22px・栞の 8×22px・影の 2px などの寸法は、部品 README 由来の局所定数としてファイル内に置く（色は足さない）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 大きさが ID から決まる・範囲内 | `lib/__tests__/spineLayout.test.ts` |
| 段ごとの幅が超えない・順序・1 冊で幅超え・0 冊 | 同上（`layoutShelfRows`） |
| 読み上げラベル | `lib/__tests__/spineLabel.test.ts` と `components/__tests__/Spine.test.tsx`（`getByLabelText`） |
| 栞はお気に入りだけ、ステータスで見た目が変わらない | `Spine.test.tsx`（栞の `testID` の有無。ステータスだけ違う 2 冊で同じスタイル） |
| 背表紙タップ | `Spine.test.tsx`、`RecordsScreen.test.tsx`（`onOpen` に id） |
| 段の数 = 棚板の数 | `components/__tests__/Shelf.test.tsx`（幅を狭くして折り返しを確認） |
| 並べ替えても大きさが変わらない | `RecordsScreen.test.tsx`（並び順を変えて同じ本のスタイルを比較） |
| ステータスの絞り込みと件数 | `StatusTabs.test.tsx`、`RecordsScreen.test.tsx`（初期値「すべて」、各タブで表示が変わる、件数、`dropped` は「すべて」だけ、0 冊の案内） |
| 見出し・冊数・今年読んだ | `RecordsScreen.test.tsx`（`jest.useFakeTimers().setSystemTime` で今年を固定） |
| 凡例・チップ行・「＋ 本棚を作る」 | `RecordsScreen.test.tsx`、`ShelfChips.test.tsx` |
| 本がないとき・「本を追加する」でシートが開く | `RecordsScreen.test.tsx`、`EmptyState.test.tsx` |
| 追加ボタン・並び替えボタン | `RecordsScreen.test.tsx` |
| タブバーのラベル | `src/__tests__/tabs.test.tsx`（既存を更新: 「本棚」「振り返り」「設定」、「記録」が無い） |
| `heroCriterion` を外す | 既存の設定・バックアップ関連テストを更新。`settingsStore.test.ts` に「保存データに `heroCriterion` が残っていても読める」を追加 |

見た目の確認: 撮影ツールは使えない前提で、表示される要素・文言・状態の出し分けを Jest で確認する（使えるなら `shelf.png` と見比べて PR に書く）。

## 判断ログ

1. **縦書き**: 1 文字ずつ縦に積む簡易実装。却下: `writing-direction`（RN 未対応）、テキストを回転（折り返し・サイズ計算が不安定で、同じ背表紙の幅に収まらない）。理由: 追加依存なしで、切り捨て（高さに収まらない分は切る）も `overflow` で実現でき、読み上げは `Pressable` のラベルに任せられる。長音・括弧の回転は後続で改善する。
2. **本棚の切り替えチップ**: 「すべての本」と「＋ 本棚を作る」だけ出し、本棚データは読まない。却下: `shelfRepository` から読んで作った本棚のチップも出す（絞り込みが動かないチップを出すと誤解を生む。Issue も #86 で動かすとしている）。`ShelfChips` に `shelves` props の口だけ用意し、#86 がつなぐ。
3. **背表紙の読み上げのステータス語**: 「読んでる／読んだ／読みたい／途中でやめた」。却下: `getStatusLabel`（「読み終わった」。記録フォームの文言で、デザインの語と違う）。`getStatusLabel` 自体は書き換えない（フォーム・既存テストへの影響を避ける）。デザインの語に揃える全面的な見直しは、フォームを作り替える #87 以降。
4. **`dropped`（途中でやめた）**: 「すべて」にだけ出る。却下: 「読んだ」に含める（意味が違う）、タブを増やす（デザインは 4 つ）。デザインのステータスは 3 つで、#83 後も型には残っているための扱い。
5. **冊数の表示**: 「全冊数」と「今年読んだ」は絞り込みの影響を受けない。理由: 見出しの数字は「棚全体の積み上がり」を示し、ステータスのタブが件数を持っているため。
6. **タップ先**: 画面は `onOpen(id)` のまま、遷移先の振り分け（読んでる本 / 読み返す）はルート側 1 か所。却下: 今シグネチャを `onOpen(record)` に変える（後続が必要になったとき変えれば足りる）。ただし読んでる本と読み返すの画面ができるまでは、どちらも `/records/<id>`。
7. **「上に大きく出す作品」の設定**: 型・保存・設定画面・シートごと削除。却下: 型だけ残す（使われないデータを抱える）。保存データに残っていても無視するだけ（移行不要）。`lib/heroColor.ts` は詳細画面が使うので残す。
8. **`YearCounter` / `CoverCard`**: 削除（デザインで廃止予定。使われなくなる）。対応するテストも同じ PR で削除するので、テスト削除の条件（対象ソースも削除）を満たす。ほかのテストファイルのケースを減らす必要がある場合（`heroCriterion` 関連）は、フィールドが無くなったことに伴う削除として PR 本文の判断ログに書く。
9. **棚の描画**: 1 段 = 1 行の単純な描画（仮想化なし）。デザインの記述どおり。件数が増えてから `FlatList` 化を検討する。
10. **絞り込みの保存**: 保存しない。理由: 初期値は「すべて」と決まっていて、デザインにも記述が無い。
11. **幅の基準**: 棚幅は `useWindowDimensions().width − space[4] * 2`。理由: `Shelf` の README どおり。画面の左右の余白（`space[5]`）とは別に、棚だけが広く取る。
12. **タブバーのアイコン**: 新しいアイコンライブラリは入れず、`View` で描く。却下: `@expo/vector-icons` の既存の字形（書斎のアイコンと形が違う）、SVG ライブラリの追加（依存を増やす）。
