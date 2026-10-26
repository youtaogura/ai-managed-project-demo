# Issue #43 【画面】分析を「振り返り」として新デザインにする

## 背景・目的

「分析」タブは、#39 でタブ名が「振り返り」になり見出しだけ新デザインになったが、中身は旧デザイン（`src/theme.ts` 経由の色、数字の羅列）のまま。
`docs/design-system/screens/README.md` の「振り返り」（`review.png`、`review-empty.png`）に合わせ、記録が積み上がっていく様子が見える画面にする。

## スコープ

### やること
- `AnalyticsScreen` を `ReviewScreen` に置き換える（見出し・対象期間・2 つの数字・月別の積み上げ棒・未入力の案内・レーティング分布・種別ごとの平均）
- 記録 0 件のときの空表示（点線の空の棒グラフ、説明、「記録する」で追加シート）
- `src/lib/analytics.ts` の拡張（対象期間・年間合計の算出）
- `MonthlyBarChart` / `RatingDistribution` を新デザインのトークンで作り直す
- 追加シートの開閉・遷移ロジックを `RecordsScreen` と共有できるよう切り出す

### やらないこと
- 期間の切り替え、グラフのタップでの絞り込み
- トークンの追加（`docs/design-system/` と `tokens.ts` は人間が変更する。提案は判断ログ）
- 新しいライブラリの追加（なし）

## 受け入れ条件

### 集計（`lib/analytics.ts`、Jest）
- [ ] 月別の完了数が、終了日の月ごと・種別ごとに積み上がる（既存の `aggregateMonthlyCompletions`。直近 12 か月、完了ステータスのみ）
- [ ] 12 か月分の合計（この 1 年で終えた作品数）を返す。範囲外の月・終了日未入力は含まない
- [ ] 対象期間の表示用文字列を返す（`now` が 2026-10 なら `2025/11 – 2026/10`。区切りは半角スペース + en dash）
- [ ] 平均・分布・種別ごとの平均は既存の `summarizeRatings` の結果と一致する（変更しない）

### 画面（`ReviewScreen`、Jest + Testing Library）
- [ ] 見出し「振り返り」と対象期間が表示される
- [ ] 「この1年で終えた」+ 件数 + 「作品」、「平均レーティング」+ 平均（レーティングが 1 件もなければ「—」）の 2 つの数字カードが出る
- [ ] 「月別の完了数」の見出しの下に 12 か月分の棒が出る。月ラベルは「11月」形式、今月のラベルだけ白（`textPrimary`）、他は `textSecondary`
- [ ] 各棒の上に件数が出る（0 件の月は「0」ではなく何も出さない）。各棒に読み上げ用の `accessibilityLabel`（例:「10月 6 作品」）がある
- [ ] 凡例（本・漫画・映画・ドラマ・アニメ）が棒の下に出る
- [ ] 終了日が未入力の完了記録が 1 件以上あるとき「終了日が未入力の記録: N 件」と「入力する」が出る。0 件のときはどちらも出ない
- [ ] 「入力する」を押すと記録一覧へ移る（`onOpenRecords` が呼ばれる）
- [ ] 「レーティング」の見出しの下に 1〜5 点台の横棒と件数が出る。最も多い段だけ白（`accent`）、他は灰色。件数が全部 0 のときはどの段も白にしない
- [ ] 「種別ごとの平均」に、記録のある種別だけ「N 作品」と平均が出る（種別の並びは本・漫画・映画・ドラマ・アニメ）
- [ ] 記録が 0 件のとき、見出し「振り返り」・空の棒グラフ・「記録がたまると、ここに振り返りが表示されます」・説明・「記録する」ボタンが出て、数字カードやグラフは出ない
- [ ] 空表示の「記録する」で追加シート（「何を記録しますか」）が開き、「手で入力する」で `onAdd` が呼ばれる
- [ ] 読み込み中は何も出さず（または進行表示）、読み込み後に表示が切り替わる
- [ ] 最下部にタブバー分の余白（`useBottomInset()` + `space`）があり、ScrollView で最後まで見られる
- [ ] 色・余白・角丸・文字は `design/tokens.ts` から使い、`src/theme.ts` を参照しない。有彩色は使わない

### ルート
- [ ] `(tabs)/analytics.tsx` は `ReviewScreen` を描画し、見出しは画面側が持つ（ルート側の見出しは外す）。ルート名 `analytics` は変えない
- [ ] 旧 `AnalyticsScreen.tsx` とそのテストは削除（`ReviewScreen` のテストに置き換える。テスト件数の減少は検査に引っかかるため、同等以上の件数を維持する）

## 画面・振る舞い

上から順に（`ScrollView`、背景 `bg`、左右 `space[5]`）:

1. ヘッダー行: 左に「振り返り」（`screenTitle`）、右に対象期間（`label`、`textSecondary`）
2. 数字カード 2 枚を横並び（`surface1`、`radius.card` 以上の角丸）: ラベル（`label`）+ `displayNumber`。左は件数 + 単位「作品」、右は平均（小数 1 桁）
3. 「月別の完了数」（`sectionTitle`）→ 積み上げ棒 12 本。下から本・漫画・映画・ドラマ・アニメの順に積む。高さは最大月を基準にした比率（最大月の高さを固定、1 件以上なら最低 2px）。棒の上に件数（`micro`）。下に月ラベル。さらに下に凡例
4. 未入力の案内（0 件なら出さない）: `surface1` の角丸の行。左に文言、右に下線付きの「入力する」（`size.touchMin` 以上のタップ領域、`accessibilityRole="button"`）
5. 「レーティング」（`sectionTitle`）→ 5 段（5 点台が上でなく**1 点台が上**。`review.png` に合わせる）。左ラベル「N点台」、中央トラック（`surface2`）+ 棒（最多の段のみ `accent`、他は `textTertiary`）、右に件数（数字のみ）
6. 「種別ごとの平均」（`label` の小見出し）→ 行ごとに「種別名 / N 作品 / 平均（`value`）」。行の間は `line` の罫線

状態:
- 読み込み中: 何も出さない（既存と同じ）
- 記録 0 件: 空表示。ヘッダー行は対象期間なしで「振り返り」のみ。`EmptyState` は一覧用の見た目（書影の点線 4 つ）なので使わず、点線の棒グラフ（高さ違いの 12 本、`lineStrong` の破線枠）を持つ専用の表示にする
- 記録はあるが完了が 1 件もない: 通常表示（数字は 0 と「—」、棒は空）。空表示にはしない
- エラー: 記録の読み込み失敗は `useRecords` の既存の扱いに従う（この画面で新しいエラー表示は作らない）

## 設計

### 追加・変更するファイル
- `app/src/lib/analytics.ts`: `summarizeYear(result)`（12 か月合計）と `formatPeriod(months)`（`YYYY/MM – YYYY/MM`）、月ラベル用 `monthLabel(month)`（`'2026-10'` → `'10月'`）を追加
- `app/src/screens/ReviewScreen.tsx`（新規）: 画面本体。props は `onAdd?: () => void`（手入力）、`onOpenRecords?: () => void`
- `app/src/components/MonthlyBarChart.tsx`: 新デザインに書き換え。props は `months`、`currentMonth`（白にする月のキー）
- `app/src/components/RatingDistribution.tsx`: 新デザインに書き換え
- `app/src/components/ReviewEmpty.tsx`（新規）: 点線の空の棒グラフ + 文言 + `Button variant="primary"`
- `app/src/hooks/useAddSheet.ts`（新規）: `RecordsScreen` の `addOpen` と `select`（`ADD_ROUTES` で `router.push`、`manual` は `onAdd`）を切り出す。`RecordsScreen` もこれを使う（挙動は変えない）
- `app/src/app/(tabs)/analytics.tsx`: `ReviewScreen` を描画。`onAdd` は `/record/new`、`onOpenRecords` は `/`（タブの記録）へ
- 削除: `screens/AnalyticsScreen.tsx`、`src/theme.ts` の `kindColors`（他に参照がなければ。残す場合は理由を判断ログへ）。`screens/__tests__/AnalyticsScreen.test.tsx` は CI の改ざん検知がテストファイルの削除を許さないため削除せず、analytics ルートが振り返り画面を表示することを確認するテストに書き換える

### 種別ごとの灰色（トークンがない間の代替）
`MEDIA_KINDS` の順に `textPrimary` / `textSecondary` / `textTertiary` / `lineStrong` / `surface2`。コンポーネント内の定数（`KIND_SHADES`）として `design/tokens.ts` の値から作る。16 進数は書かない。

### 状態管理
`useRecords()` の結果から `useMemo` で集計するだけ。`now` は 1 回だけ `new Date()`（`useMemo` 内）。追加シートの開閉は `useAddSheet` のローカル state。

### 依存
新しいパッケージは追加しない。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 集計・期間・年間合計・月ラベル | `lib/__tests__/analytics.test.ts`（境界: 13 か月前、未来月、終了日未入力、`in_progress` を除外、年またぎ） |
| 見出し・期間・数字カード・「—」 | `screens/__tests__/ReviewScreen.test.tsx`（`jest.setSystemTime(2026-10-15)`、`withRepository` + `createFakeRepository`） |
| 棒の読み上げ・件数・今月のラベルの色・凡例 | `ReviewScreen.test.tsx`（`getByLabelText('10月 6 作品')`、`StyleSheet.flatten` で色を確認）、必要なら `components/__tests__/MonthlyBarChart.test.tsx` |
| 未入力の案内の出し分け・「入力する」 | `ReviewScreen.test.tsx` |
| 分布の最多段のみ白・全 0 | `components/__tests__/RatingDistribution.test.tsx` |
| 種別ごとの平均 | `ReviewScreen.test.tsx` |
| 空表示・追加シート・手入力 | `ReviewScreen.test.tsx`（`expo-router` をモック。`RecordsScreen.test.tsx` の追加シートのテストを参考にする） |
| `useAddSheet` の切り出しで一覧が壊れない | 既存の `RecordsScreen.test.tsx` が通ること |
| 下余白 | `useBottomInset` の値を `ReviewScreen` のスクロール内容のスタイルで確認 |

撮影ツール（`ui-preview`）が使えるかは実装工程で確認する。使えなければ PR 本文にその旨を書き、「デザインどおり」とは書かない。

## 判断ログ

1. **タブのルート名（`analytics`）は変えない**。変えると URL・テスト・タブバーの対応が全部動き、得るものが表示名（`title`）の「振り返り」だけで足りるため。却下: `review` へのリネーム。
2. **「入力する」の行き先は記録一覧（タブの `/`）**。Issue の「一覧へ」に従う。終了日が未入力の記録だけに絞る機能は作らない（やらないこと: 絞り込み）。
3. **レーティングの段の並びは 1 点台が上**。`review.png` がそうなっているため。旧実装は 5 点台が上だったが画像を優先する。
4. **「この1年で終えた」は直近 12 か月の完了数**（暦年ではない）。対象期間の表示と一致させるため。平均レーティングは対象期間で絞らず**全記録**の平均（既存の `summarizeRatings`）。画像の「種別ごとの平均」「分布」が全記録の集計に見えること、既存の集計を変えないことを理由に選んだ。却下: 12 か月で絞る（期間外の評価が見えなくなり、集計関数も変わる）。
5. **記録はあるが完了が 0 件のときは空表示にしない**。Issue の空表示は「記録がないとき」と書かれているため。
6. **空表示は `EmptyState` を使わず専用の `ReviewEmpty`**。`EmptyState` の点線は書影の形で、`review-empty.png` は棒グラフの形のため。`EmptyState` の汎用化は他画面に影響するので避けた。
7. **0 件の月の棒の上は何も出さない**。「0」が 12 個並ぶとうるさいため。画像に 0 件の月がなく、デザイン側の指定もないので判断した。
8. **種別の灰色 5 段階（トークン追加の提案）**: トークンにないので、当面 `textPrimary` / `textSecondary` / `textTertiary` / `lineStrong` / `surface2` で代える。ただし最も暗い `surface2`（`#1d1d21`）は背景 `bg`（`#0e0e10`）に近く、アニメの段が見えにくい。人間に次の追加を提案する: `kind-1`〜`kind-5`（本から順に、画像から読むと概ね `#f2f2f2` / `#b9b9c0` / `#8a8a92` / `#5c5c64` / `#3d3d44`）。追加されたら `KIND_SHADES` をトークンへ差し替える。
9. **追加シートの共通化（`useAddSheet`）**: 同じ遷移ロジックを `ReviewScreen` に複製すると、ルートの追加時に片方だけ直し忘れるため。却下: 複製（変更が小さい代わりに二重管理になる）、`AddSheet` 自体に遷移を持たせる（コンポーネントが `router` に依存し、既存テストが変わる）。
