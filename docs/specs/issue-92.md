# Issue #92 振り返りを背表紙の積み上げにする

## 背景・目的

振り返り画面（`ReviewScreen`、ルートは `(tabs)/analytics.tsx`）を、デザイン `docs/design-system/screens/README.md` の「振り返り」（`review.png`）に作り替える。1 冊 = 1 段として、その本の背表紙の色で月ごとに積み上がる「読んだ本の記録」にする。依存の #84（データ）・#85（`Spine`・`Shelf`・`TabBar`・`EmptyState`）は main に入っている。未リリースなので保存データの後方互換・移行は考えない。

## スコープ

### やること
- 見出し「振り返り」と期間（直近 12 か月。既存の `formatPeriod`）。
- 3 つの数字（読んだ・感想・引用）のカード。
- 「月ごとに読んだ本」: 月ごとの積み上げ（1 冊 = 1 段、背表紙の色）。
- 「今年のお気に入り」: `Shelf` で並べる。お気に入りがなければ段ごと出さない。
- 「どうだった？」: 平均（数字と言葉）と、最高・よかった・まあまあ・あんまり の冊数。
- 「今年いちばん使った書き出し」と回数。
- 記録が 0 件のときの空の表示（`ReviewEmpty` の文言は「評価」を使わない形に見直す）。
- 古い部品の整理: `MonthlyBarChart`、`RatingDistribution`、`analytics.ts` のうち使われなくなるものを削除（対応するテストも）。

### やらないこと
- タブバー・ルート名の変更（`analytics` のまま）。`tokens.ts`・`docs/design-system/` の変更。新しい色・文字スタイルの追加。新しい依存（なし）。
- グラフのアニメーション・タップでの詳細表示。

## 受け入れ条件

### 集計（純関数。`lib/review.ts`、Jest で確認）
基準日 `now` から、**期間** = 当月を含む直近 12 か月（`aggregateMonthlyCompletions` と同じ）、**今年** = `now` の暦年。「読んだ本」= `status === 'completed'` で `endDate` が `YYYY-MM-DD` 形式かつ期間内の記録。
- [ ] 「読んだ」= 期間内に読んだ本の冊数。
- [ ] 「感想」= 期間内に読んだ本のうち、書き出しの続きを 1 つ以上書いた本の数（`oneLiner` が空白以外の文字を含む、または `starters` に `text` が空白以外のものがある）。
- [ ] 「引用」= 期間内に読んだ本の `quotes` の合計数。
- [ ] 積み上げ: 12 か月ぶんの `{ month, books[] }`。`books` はその月に `endDate` がある読んだ本で、`endDate` の古い順（同日は `createdAt` 古い順 → `id`）に下から積む。各要素は `id`・`spineColor`。月の冊数がその月の数字。
- [ ] お気に入り: `favorite === true` かつ `endDate` が今年の記録（`status` 問わず。`endDate` が今年のもののみ）。並びは設定の並び順ではなく `endDate` の新しい順（同日は `createdAt` 新しい順）。
- [ ] 「どうだった？」: 対象は期間内に読んだ本のうち `rating` が非 null のもの。平均は小数 1 桁（既存 `average` と同じ丸め）。区分は `rating >= 5` 最高、`>= 4` よかった、`>= 3` まあまあ、それ未満 あんまり（`getRatingWord` と同じ境界）。平均の言葉は `getRatingWord(平均)`。対象 0 冊なら平均は「—」で言葉は出さず、4 区分はすべて 0。
- [ ] いちばん使った書き出し: 今年（`endDate` が今年）の本について、`oneLiner` が書かれていれば固定の書き出し（`STARTER_FIXED`）を 1 回、`starters` の各 `text` が空でないエントリはその `starter` を 1 回として数え、最多のもの（同数は先に現れた順）と回数。0 件なら null。
- [ ] 期間外・未読了・`endDate` 不正の本は、読んだ・感想・引用・積み上げ・どうだった？に入らない。

### 画面（`ReviewScreen`、Jest + Testing Library）
- [ ] 見出し「振り返り」と期間（例「2025/11 – 2026/10」）。
- [ ] 3 つのカードのラベルが「読んだ」「感想」「引用」。値は上の集計と一致（「読んだ」のみ数字に「冊」を付ける: 例「48 冊」）。
- [ ] 積み上げの各段（`testID="stack-segment-<recordId>"`）の `backgroundColor` が、その本の `spineColor` に対応する `colors.spineN`。月ごとの合計の数字が、その月の冊数と一致。0 冊の月は数字を出さない。今月のラベルだけ `textPrimary`、ほかは `textSecondary`。月ラベルは「11月」形式、各月の列に読み上げラベル「<月> <n> 冊」。注記「1冊が1段。背表紙の色で積み上がります」を出す。
- [ ] 「今年のお気に入り」: お気に入りがあるときだけ見出しと `Shelf`（背表紙のタップで詳細 `/records/<id>` へ。`onOpenRecord?: (id: string) => void`）。ないときは見出しごと出ない。
- [ ] 「どうだった？」: 「平均」と数字（例「3.9」）と言葉（例「まあまあ」）。4 区分は上から 最高・よかった・まあまあ・あんまり の順で、各冊数を出す。バーはいちばん多い区分だけ `textPrimary`、ほかは `textTertiary`。最大が 0 のときは全部 `textTertiary`。
- [ ] 「今年いちばん使った書き出し」: 書き出しの文と「· 27 回」。使われた書き出しがないときは、この段を出さない。
- [ ] 画面のどこにも「評価」の文字が出ない（`queryByText(/評価/)` が null。空の表示・アクセシビリティラベル含む。`レーティング` も使わない）。
- [ ] 「終了日が未入力の記録」の案内は、デザインに無いので外す（`onOpenRecords` props も外し、`analytics.tsx` から渡さない）。
- [ ] 記録が 0 件のとき `ReviewEmpty`（点線の空の積み上げ + 案内 + 主ボタン「本を追加する」）を出し、押すと追加シートが開く。見出しは出す。読み込み中は何も出さない（今までどおり）。
- [ ] 下の余白は `space[6] + bottomInset`。画面全体が 1 つの縦 `ScrollView`（`testID="review-scroll"`）。

## 画面・振る舞い

上から: 見出し行（左「振り返り」`screenTitle`、右に期間 `label`・`textSecondary`）→ 3 カード（`surface1`、`radius.card`、ラベル `label`、値 `displayNumber`）→「月ごとに読んだ本」（`sectionTitle`）+ 積み上げ + 注記 → 「今年のお気に入り」+ `Shelf`（幅は `useWindowDimensions().width − space[4] * 2`、画面の左右余白に合わせる）→「どうだった？」→「今年いちばん使った書き出し」（カード、書き出しは明朝の `value` 相当、回数は `label`）。

積み上げ: 12 列を等幅に並べ、各列は下揃え。1 段の高さ 12px・段の間隔 2px・幅いっぱい・角丸 2px。最も高い列でも画面に収まるよう、段数が 8 冊を超える月は上限 8 段まで描き（数字は実数）、超えた分は描かない。月の数字は `micro`、列の上。

状態は読み込み（`loading`）・空・通常の 3 つ。`useRecords` の再読み込み（`useFocusEffect`）は既存どおり。取得失敗は空配列 → 空の表示。集計は `useMemo`。`now` は描画時に `new Date()`。

## 設計

### 追加・変更するファイル
- `src/lib/review.ts`（新規）: `summarizeReview(records, now): ReviewSummary`（上の集計を 1 つの純関数にまとめる）。型 `ReviewSummary = { period: string; read: number; impressions: number; quotes: number; months: { month: string; books: { id: string; spineColor: SpineColor }[] }[]; favorites: MediaRecord[]; ratings: { average: number | null; word: string | null; buckets: { label: '最高'|'よかった'|'まあまあ'|'あんまり'; count: number }[] }; topStarter: { text: string; count: number } | null }`。月キー・期間文字列は `analytics.ts` の `monthLabel`/`formatPeriod`/`formatAverage` を再利用（`aggregateMonthlyCompletions` は月の枠の生成に使う）。
- `src/components/BookStackChart.tsx`（新規）: props `months`、`currentMonth`。`MonthlyBarChart` の後継。色の対応は `Spine.tsx` の `SPINE_FACES` を `lib/spineColor.ts` へ移して共有する（`Spine` はそこから import。挙動は変えない。`spineColorToken(color): string`）。
- `src/components/RatingBreakdown.tsx`（新規）: 4 区分のバー。`RatingDistribution` の後継。
- `src/components/ReviewEmpty.tsx`: 文言変更と点線の積み上げ（高さ違いの空の段）。ボタン「本を追加する」。
- `src/screens/ReviewScreen.tsx`: 作り替え。props `onAdd?`、`onOpenRecord?`。
- `src/app/(tabs)/analytics.tsx`: `onOpenRecord={(id) => router.push(\`/records/${id}\`)}`、`onOpenRecords` を外す。
- 削除: `MonthlyBarChart.tsx`、`RatingDistribution.tsx`（と各テスト、ソースと同時削除）。`analytics.ts` の使われなくなった関数（`summarizeRatings` など）は削除し、対応する `analytics.test.ts` のケースも削除（使う関数は残す）。テスト削除の理由は PR 本文に書く。
- データ構造・保存データ・設定の変更なし。新しい依存なし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 各集計（読んだ・感想・引用・積み上げ・お気に入り・どうだった？・書き出し・期間外の除外） | `lib/__tests__/review.test.ts`（`now` を引数で固定。境界: 期間の端、`endDate` 不正、同日の並び、同数の書き出し、評価 4.0/3.0/5.0、0 件） |
| 色の共有 | `lib/__tests__/spineColor.test.ts`、既存 `Spine.test.tsx` が通る |
| 段の色・月の数字・今月ラベル・読み上げ・上限 8 段 | `components/__tests__/BookStackChart.test.tsx` |
| バーの色（最多だけ墨）・順序 | `components/__tests__/RatingBreakdown.test.tsx` |
| 画面の表示値・お気に入りの出し分け・書き出しの出し分け・「評価」が出ない・空の表示と追加シート | `screens/__tests__/ReviewScreen.test.tsx`（`jest.setSystemTime(new Date(2026, 9, 15))`、`makeRecord` で記録を作る）。`AnalyticsScreen.test.tsx`・`screens.test.tsx`・`tabs.test.tsx`・`headers.test.tsx` の旧文言を更新 |
| お気に入りの背表紙タップで `onOpenRecord` | `ReviewScreen.test.tsx` |
| ルート | 既存の route テストを更新（`/records/<id>`） |

見た目の確認は、撮影ツールが使えれば `review.png` と見比べて PR に書く。使えなければその旨を書き、上の Jest で要素・文言・出し分けを確認する。

## 判断ログ

1. **3 つの数字の対象**: Issue は対象期間を明記していない。見出しが「直近 12 か月」なので、読んだ・感想・引用はすべて期間内に読んだ本に揃える（感想 ≤ 読んだ になり、画像の 48/31 とも整合）。却下: 全期間の数（見出しの期間と食い違う）。引用は `QuoteEntry` に日付があるが、本の読了月に揃える方が説明しやすいため本基準にした。
2. **「感想」の数え方**: デザインは「書き出しの続きを 1 つ以上書いた本」。固定の「ひとことで言うと、」の続き（`oneLiner`）も書き出しの 1 つなので数える。空白だけの入力は書いたことにしない。
3. **お気に入りの「今年」**: 読み終えた日（`endDate`）が今年のもの。未読了の本は日付がなく「今年」と言えないので出さない。並びは設定の並び順ではなく読み終えた日の新しい順（振り返りは設定に依存させない）。
4. **書き出しの集計対象**: 今年に読み終えた本。「ひとことで言うと、」も候補に入れる（`STARTER_FIXED`）。同数は先に現れた順（決定的にするため）。
5. **評価の区分**: 既存の `getRatingWord` と同じ境界（5 / 4 / 3 未満）に揃え、平均の言葉と区分が食い違わないようにする。既存の 1〜5 点台の分布は廃止。
6. **「評価」を画面に出さない**: 受け入れ条件に従い、「平均レーティング」「レーティング」「評価」を使わない。デザインどおり「どうだった？」「平均」。
7. **積み上げの上限 8 段**: 1 か月に多く読んでも画面からはみ出さないため。数字は実数を出す。却下: 高さを縮尺する（段の色が見えなくなる）。
8. **「終了日が未入力」の案内を外す**: デザインに無く、新しい画面の構成を優先。`onOpenRecords` も不要になる。
9. **古い部品は削除**: `MonthlyBarChart`・`RatingDistribution` は後継ができるため、同じ PR でソースとテストを削除する（`pr-policy` の条件）。
10. **背表紙の色の対応表の共有**: `Spine` の対応表を `lib/spineColor.ts` に移し、積み上げでも使う（色の定義を 1 か所に保つため）。
